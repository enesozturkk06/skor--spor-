import { isSportId, type SportId } from '@/features/athlete/catalog';
import { getExercise } from '@/features/exercises/catalog';
import { isUuid, uuid } from '@/lib/uuid';

import { DEFAULT_REST_S, REST_LIMITS, ROUND_LIMITS, clockMs, restRemainingMs, roundEndIso, roundState } from './timers';
import type { ActiveWorkout, DraftExercise, DraftSet, LoggedSet, RestTimer, RoundTimer, SetKind, Workout } from './types';

/**
 * Pure workout logic: building, editing and finishing a workout, and
 * defensive parsing of stored / remote data. Limits mirror the planned
 * database constraints exactly, so anything that passes here is accepted
 * by the server (training migration draft, Phase 3 plan).
 */
export const LIMITS = {
  nameMax: 80,
  notesMax: 1000,
  maxDurationMs: 12 * 60 * 60 * 1000,
  futureToleranceMs: 5 * 60 * 1000,
  setsPerWorkout: 300,
  exercisesPerWorkout: 60,
  setsPerExercise: 50,
  reps: 1000,
  weightKg: 1000,
  durationS: 43_200,
  distanceM: 1_000_000,
  restS: 3600,
} as const;

const EXERCISE_KEY = /^[a-z0-9_]{2,64}$/;
const KINDS: readonly SetKind[] = ['normal', 'warmup', 'drop', 'failure'];

export class WorkoutError extends Error {}

/* ------------------------------------------------------------ editing */

export function createActiveWorkout(o: { userId: string; name: string; sport: SportId; now?: Date; templateId?: string | null }): ActiveWorkout {
  const now = (o.now ?? new Date()).toISOString();
  return {
    v: 1,
    id: uuid(),
    userId: o.userId,
    name: cleanName(o.name),
    sport: o.sport,
    templateId: o.templateId ?? null,
    startedAt: now,
    updatedAt: now,
    exercises: [],
    pausedAt: null,
    pausedMs: 0,
    rest: null,
    roundTimer: null,
  };
}

const blankSet = (): DraftSet => ({
  uid: uuid(),
  kind: 'normal',
  reps: null,
  weightKg: null,
  durationS: null,
  distanceM: null,
  restS: null,
  rpe: null,
  done: false,
  completedAt: null,
});

const touch = (w: ActiveWorkout, exercises: DraftExercise[], now = new Date()): ActiveWorkout => ({
  ...w,
  exercises,
  updatedAt: now.toISOString(),
});

export function addExercise(w: ActiveWorkout, exerciseKey: string): ActiveWorkout {
  const ex = getExercise(exerciseKey);
  if (!ex) throw new WorkoutError('Bilinmeyen egzersiz.');
  if (w.exercises.length >= LIMITS.exercisesPerWorkout) throw new WorkoutError('Bir antrenmana en fazla 60 egzersiz eklenebilir.');
  return touch(w, [...w.exercises, { uid: uuid(), exerciseKey: ex.key, exerciseName: ex.name.tr, restS: DEFAULT_REST_S[ex.modality], sets: [blankSet()], plannedRounds: null }]);
}

export function removeExercise(w: ActiveWorkout, exUid: string): ActiveWorkout {
  const next = touch(w, w.exercises.filter((e) => e.uid !== exUid));
  return {
    ...next,
    rest: w.rest?.exUid === exUid ? null : w.rest,
    roundTimer: w.roundTimer?.exUid === exUid ? null : w.roundTimer,
  };
}

const mapExercise = (w: ActiveWorkout, exUid: string, fn: (e: DraftExercise) => DraftExercise) =>
  touch(w, w.exercises.map((e) => (e.uid === exUid ? fn(e) : e)));

/** Adds a set pre-filled with the previous set's values (the usual way people log). */
export function addSet(w: ActiveWorkout, exUid: string): ActiveWorkout {
  return mapExercise(w, exUid, (e) => {
    if (e.sets.length >= LIMITS.setsPerExercise) throw new WorkoutError('Bir egzersizde en fazla 50 set olabilir.');
    const last = e.sets[e.sets.length - 1];
    const next: DraftSet = last
      ? { ...blankSet(), kind: last.kind === 'warmup' ? 'normal' : last.kind, reps: last.reps, weightKg: last.weightKg, durationS: last.durationS, distanceM: last.distanceM, restS: last.restS }
      : blankSet();
    return { ...e, sets: [...e.sets, next] };
  });
}

export function removeSet(w: ActiveWorkout, exUid: string, setUid: string): ActiveWorkout {
  const next = mapExercise(w, exUid, (e) => ({ ...e, sets: e.sets.filter((s) => s.uid !== setUid) }));
  return w.rest?.setUid === setUid ? { ...next, rest: null } : next;
}

export type SetPatch = Partial<Pick<DraftSet, 'kind' | 'reps' | 'weightKg' | 'durationS' | 'distanceM' | 'restS' | 'rpe'>>;

export function updateSet(w: ActiveWorkout, exUid: string, setUid: string, patch: SetPatch): ActiveWorkout {
  return mapExercise(w, exUid, (e) => ({ ...e, sets: e.sets.map((s) => (s.uid === setUid ? { ...s, ...cleanPatch(patch) } : s)) }));
}

export function setDone(w: ActiveWorkout, exUid: string, setUid: string, done: boolean, now = new Date()): ActiveWorkout {
  return mapExercise(w, exUid, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.uid === setUid ? { ...s, done, completedAt: done ? now.toISOString() : null } : s)),
  }));
}

export const doneSetCount = (w: ActiveWorkout) => w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done && hasMetric(s)).length, 0);

/* ------------------------------------------------- live session actions */

const iso0 = (ms: number) => new Date(ms).toISOString();

/**
 * Marks a set done and starts the rest countdown for its exercise (unless a
 * round clock is running — rounds carry their own rest). A set needs a value:
 * `fill` (e.g. last session's numbers) is applied first when given.
 */
export function completeSet(w: ActiveWorkout, exUid: string, setUid: string, now: number, fill?: SetPatch): ActiveWorkout {
  let next = fill ? updateSet(w, exUid, setUid, fill) : w;
  const set = next.exercises.find((e) => e.uid === exUid)?.sets.find((s) => s.uid === setUid);
  if (!set || !hasMetric(set)) throw new WorkoutError('Önce bir değer gir.');
  next = setDone(next, exUid, setUid, true, new Date(clockMs(w, now)));
  if (w.roundTimer) return next;
  const ex = next.exercises.find((e) => e.uid === exUid)!;
  const rest: RestTimer = { exUid, setUid, startedAt: iso0(clockMs(w, now)), durationS: ex.restS };
  return { ...next, rest };
}

export function uncompleteSet(w: ActiveWorkout, exUid: string, setUid: string): ActiveWorkout {
  const next = setDone(w, exUid, setUid, false);
  return w.rest?.setUid === setUid ? { ...next, rest: null } : next;
}

/** ±15 s on the running rest; the new length is remembered for the exercise's next sets. */
export function adjustRest(w: ActiveWorkout, deltaS: number, now: number): ActiveWorkout {
  if (!w.rest) return w;
  const elapsedS = (clockMs(w, now) - Date.parse(w.rest.startedAt)) / 1000;
  const durationS = Math.min(REST_LIMITS.max, Math.max(REST_LIMITS.min, w.rest.durationS + deltaS));
  if (durationS <= elapsedS) return { ...w, rest: null }; // shortened past zero: rest is over
  const exUid = w.rest.exUid;
  return {
    ...w,
    rest: { ...w.rest, durationS },
    exercises: w.exercises.map((e) => (e.uid === exUid ? { ...e, restS: durationS } : e)),
    updatedAt: iso0(now),
  };
}

export const skipRest = (w: ActiveWorkout): ActiveWorkout => (w.rest ? { ...w, rest: null } : w);

/** Clears a finished rest (returns the same object when nothing changes). */
export function expireRest(w: ActiveWorkout, now: number): ActiveWorkout {
  const left = restRemainingMs(w, now);
  return left !== null && left <= 0 ? { ...w, rest: null } : w;
}

export function pauseWorkout(w: ActiveWorkout, now: number): ActiveWorkout {
  return w.pausedAt ? w : { ...w, pausedAt: iso0(now), updatedAt: iso0(now) };
}

/** Resumes: every running clock is shifted by the pause, so nothing advanced meanwhile. */
export function resumeWorkout(w: ActiveWorkout, now: number): ActiveWorkout {
  if (!w.pausedAt) return w;
  const delta = Math.max(0, now - Date.parse(w.pausedAt));
  const shift = (t: string) => iso0(Date.parse(t) + delta);
  return {
    ...w,
    pausedAt: null,
    pausedMs: w.pausedMs + delta,
    rest: w.rest ? { ...w.rest, startedAt: shift(w.rest.startedAt) } : null,
    roundTimer: w.roundTimer ? { ...w.roundTimer, startedAt: shift(w.roundTimer.startedAt) } : null,
    updatedAt: iso0(now),
  };
}

export type RoundConfig = { rounds: number; roundS: number; restS: number };

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));

export function startRounds(w: ActiveWorkout, exUid: string, cfg: RoundConfig, now: number): ActiveWorkout {
  if (!w.exercises.some((e) => e.uid === exUid)) return w;
  const t: RoundTimer = {
    exUid,
    startedAt: iso0(clockMs(w, now)),
    rounds: clampInt(cfg.rounds, ROUND_LIMITS.rounds.min, ROUND_LIMITS.rounds.max),
    roundS: clampInt(cfg.roundS, ROUND_LIMITS.roundS.min, ROUND_LIMITS.roundS.max),
    restS: clampInt(cfg.restS, ROUND_LIMITS.restS.min, ROUND_LIMITS.restS.max),
    prepS: ROUND_LIMITS.prepS,
  };
  return { ...w, rest: null, roundTimer: t, updatedAt: iso0(now) };
}

/**
 * Logs every round that has ended as a done set (duration = round length),
 * reusing empty sets first. Idempotent: returns the same object when there is
 * nothing new, so callers can run it on every tick. Ends the clock when done.
 */
export function syncRounds(w: ActiveWorkout, now: number): ActiveWorkout {
  const t = w.roundTimer;
  if (!t) return w;
  const ex = w.exercises.find((e) => e.uid === t.exUid);
  if (!ex) return { ...w, roundTimer: null };
  const state = roundState(t, clockMs(w, now));
  const startedDone = ex.sets.filter((s) => s.done && s.completedAt && s.completedAt >= t.startedAt).length;
  const missing = state.completedRounds - startedDone;
  if (missing <= 0) return state.phase === 'done' ? { ...w, roundTimer: null } : w;

  const sets = [...ex.sets];
  let round = startedDone;
  for (let i = 0; i < sets.length && round < state.completedRounds; i++) {
    if (sets[i].done) continue;
    round += 1;
    sets[i] = { ...sets[i], durationS: sets[i].durationS ?? t.roundS, done: true, completedAt: roundEndIso(t, round) };
  }
  while (round < state.completedRounds && sets.length < LIMITS.setsPerExercise) {
    round += 1;
    sets.push({ ...blankSet(), durationS: t.roundS, restS: t.restS, done: true, completedAt: roundEndIso(t, round) });
  }
  const next: ActiveWorkout = { ...w, exercises: w.exercises.map((e) => (e.uid === ex.uid ? { ...e, sets } : e)), updatedAt: iso0(now) };
  return state.phase === 'done' ? { ...next, roundTimer: null } : next;
}

/** Stops the round clock early, keeping the rounds already finished. */
export function stopRounds(w: ActiveWorkout, now: number): ActiveWorkout {
  const synced = syncRounds(w, now);
  return synced.roundTimer ? { ...synced, roundTimer: null } : synced;
}

/* ------------------------------------------------------------ finishing */

const hasMetric = (s: { reps: number | null; durationS: number | null; distanceM: number | null }) =>
  s.reps !== null || s.durationS !== null || s.distanceM !== null;

/**
 * Turns the draft into a workout: only completed sets with a value are kept,
 * exercises and sets are renumbered, times are bounded like the database does.
 */
export function finalizeWorkout(w: ActiveWorkout, o: { now?: Date; rpe?: number | null; notes?: string | null } = {}): Workout {
  const now = o.now ?? new Date();
  const sets: LoggedSet[] = [];
  let position = 0;
  for (const e of w.exercises) {
    const done = e.sets.filter((s) => s.done && hasMetric(s));
    if (!done.length) continue;
    position += 1;
    done.forEach((s, i) =>
      sets.push({
        exerciseKey: e.exerciseKey,
        exerciseName: e.exerciseName.slice(0, LIMITS.nameMax),
        position,
        setIndex: i + 1,
        kind: s.kind,
        reps: s.reps,
        weightKg: s.weightKg,
        durationS: s.durationS,
        distanceM: s.distanceM,
        restS: s.restS,
        rpe: s.rpe,
        completedAt: s.completedAt,
      }),
    );
  }
  if (!sets.length) throw new WorkoutError('Bitirmek için en az bir seti tamamla.');
  if (sets.length > LIMITS.setsPerWorkout) throw new WorkoutError('Bir antrenmanda en fazla 300 set olabilir.');

  const started = new Date(w.startedAt).getTime();
  // Paused time is not training time: the end moves back by it (and a
  // workout finished while paused ends at the pause).
  const trainedUntil = clockMs(w, now.getTime()) - (w.pausedMs ?? 0);
  // A forgotten session (left open overnight) is capped at the 12 h maximum.
  const ended = Math.max(started, Math.min(trainedUntil, started + LIMITS.maxDurationMs));
  const notes = o.notes?.trim() ? o.notes.trim().slice(0, LIMITS.notesMax) : null;
  return {
    id: w.id,
    userId: w.userId,
    name: w.name,
    sport: w.sport,
    templateId: w.templateId,
    startedAt: w.startedAt,
    endedAt: new Date(ended).toISOString(),
    rpe: validRpe(o.rpe) ? o.rpe : null,
    notes,
    sets,
  };
}

/** Body of the save_workout(jsonb) RPC. The server takes the user from the session, never from here. */
export function toSavePayload(w: Workout) {
  return {
    id: w.id,
    name: w.name,
    sport: w.sport,
    template_id: w.templateId,
    started_at: w.startedAt,
    ended_at: w.endedAt,
    rpe: w.rpe,
    notes: w.notes,
    sets: w.sets.map((s) => ({
      exercise_key: s.exerciseKey,
      exercise_name: s.exerciseName,
      position: s.position,
      set_index: s.setIndex,
      kind: s.kind,
      reps: s.reps,
      weight_kg: s.weightKg,
      duration_s: s.durationS,
      distance_m: s.distanceM,
      rest_s: s.restS,
      rpe: s.rpe,
      completed_at: s.completedAt,
    })),
  };
}

export const durationMinutes = (w: Pick<Workout, 'startedAt' | 'endedAt'>) =>
  Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 60000);

/* -------------------------------------------------------- sanitizing */

function cleanName(name: string) {
  const n = name.trim().slice(0, LIMITS.nameMax);
  return n || 'Antrenman';
}

const validRpe = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10;

/** Integer/decimal in [0, max], else null. Weight keeps 2 decimals (numeric(6,2)). */
function num(v: unknown, max: number, decimals = 0): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function cleanPatch(p: SetPatch): SetPatch {
  const out: SetPatch = {};
  if ('kind' in p) out.kind = KINDS.includes(p.kind!) ? p.kind : 'normal';
  if ('reps' in p) out.reps = num(p.reps, LIMITS.reps);
  if ('weightKg' in p) out.weightKg = num(p.weightKg, LIMITS.weightKg, 2);
  if ('durationS' in p) out.durationS = num(p.durationS, LIMITS.durationS);
  if ('distanceM' in p) out.distanceM = num(p.distanceM, LIMITS.distanceM);
  if ('restS' in p) out.restS = num(p.restS, LIMITS.restS);
  if ('rpe' in p) out.rpe = validRpe(p.rpe) ? p.rpe : null;
  return out;
}

const iso = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v : null);

function sanitizeSet(raw: unknown): LoggedSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const key = typeof s.exerciseKey === 'string' && EXERCISE_KEY.test(s.exerciseKey) ? s.exerciseKey : null;
  const name = str(s.exerciseName, LIMITS.nameMax);
  const position = typeof s.position === 'number' && Number.isInteger(s.position) && s.position >= 1 && s.position <= 60 ? s.position : null;
  const setIndex = typeof s.setIndex === 'number' && Number.isInteger(s.setIndex) && s.setIndex >= 1 && s.setIndex <= 50 ? s.setIndex : null;
  if (!key || !name || !position || !setIndex) return null;
  const set: LoggedSet = {
    exerciseKey: key,
    exerciseName: name,
    position,
    setIndex,
    kind: KINDS.includes(s.kind as SetKind) ? (s.kind as SetKind) : 'normal',
    reps: num(s.reps, LIMITS.reps),
    weightKg: num(s.weightKg, LIMITS.weightKg, 2),
    durationS: num(s.durationS, LIMITS.durationS),
    distanceM: num(s.distanceM, LIMITS.distanceM),
    restS: num(s.restS, LIMITS.restS),
    rpe: validRpe(s.rpe) ? s.rpe : null,
    completedAt: iso(s.completedAt),
  };
  return hasMetric(set) ? set : null;
}

/** Never trust stored or remote data blindly; a workout of another user is rejected. */
export function sanitizeWorkout(raw: unknown, userId: string): Workout | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  if (!isUuid(w.id) || w.userId !== userId || !isSportId(w.sport)) return null;
  const name = str(w.name, LIMITS.nameMax);
  const startedAt = iso(w.startedAt);
  const endedAt = iso(w.endedAt);
  if (!name || !startedAt || !endedAt) return null;
  const span = Date.parse(endedAt) - Date.parse(startedAt);
  if (span < 0 || span > LIMITS.maxDurationMs) return null;
  const sets = Array.isArray(w.sets) ? w.sets.map(sanitizeSet).filter((s): s is LoggedSet => s !== null) : [];
  if (!sets.length || sets.length > LIMITS.setsPerWorkout) return null;
  // (position, set_index) is unique per workout in the database.
  if (new Set(sets.map((s) => `${s.position}:${s.setIndex}`)).size !== sets.length) return null;
  return {
    id: w.id,
    userId,
    name,
    sport: w.sport,
    templateId: isUuid(w.templateId) ? w.templateId : null,
    startedAt,
    endedAt,
    rpe: validRpe(w.rpe) ? w.rpe : null,
    notes: typeof w.notes === 'string' && w.notes.trim() ? w.notes.slice(0, LIMITS.notesMax) : null,
    sets,
  };
}

function sanitizeDraftSet(raw: unknown): DraftSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.uid !== 'string') return null;
  return {
    uid: s.uid,
    ...(cleanPatch({
      kind: s.kind as SetKind,
      reps: s.reps as number,
      weightKg: s.weightKg as number,
      durationS: s.durationS as number,
      distanceM: s.distanceM as number,
      restS: s.restS as number,
      rpe: s.rpe as number,
    }) as Required<SetPatch>),
    done: s.done === true,
    completedAt: s.done === true ? iso(s.completedAt) : null,
  };
}

/** A corrupted or foreign draft must never break the app: it is dropped instead. */
export function sanitizeActive(raw: unknown, userId: string): ActiveWorkout | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  if (w.v !== 1 || !isUuid(w.id) || w.userId !== userId || !isSportId(w.sport)) return null;
  const startedAt = iso(w.startedAt);
  if (!startedAt || Date.parse(startedAt) > Date.now() + LIMITS.futureToleranceMs) return null;
  const exercises: DraftExercise[] = [];
  for (const e of Array.isArray(w.exercises) ? w.exercises.slice(0, LIMITS.exercisesPerWorkout) : []) {
    const x = e as Record<string, unknown>;
    if (!x || typeof x.uid !== 'string' || typeof x.exerciseKey !== 'string' || !EXERCISE_KEY.test(x.exerciseKey)) continue;
    const name = str(x.exerciseName, LIMITS.nameMax) ?? getExercise(x.exerciseKey)?.name.tr;
    if (!name) continue;
    const sets = (Array.isArray(x.sets) ? x.sets.slice(0, LIMITS.setsPerExercise) : []).map(sanitizeDraftSet).filter((s): s is DraftSet => s !== null);
    const restS = typeof x.restS === 'number' && x.restS >= REST_LIMITS.min && x.restS <= REST_LIMITS.max ? Math.round(x.restS) : DEFAULT_REST_S[getExercise(x.exerciseKey)?.modality ?? 'strength'];
    const pr = x.plannedRounds as Partial<RoundTimer> | null | undefined;
    const plannedRounds =
      pr && typeof pr === 'object' && Number.isInteger(pr.rounds) && Number.isInteger(pr.roundS) && Number.isInteger(pr.restS)
        ? { rounds: pr.rounds!, roundS: pr.roundS!, restS: pr.restS! }
        : null;
    exercises.push({ uid: x.uid, exerciseKey: x.exerciseKey, exerciseName: name, restS, sets, plannedRounds });
  }
  return {
    v: 1,
    id: w.id,
    userId,
    name: cleanName(typeof w.name === 'string' ? w.name : ''),
    sport: w.sport,
    templateId: isUuid(w.templateId) ? w.templateId : null,
    startedAt,
    updatedAt: iso(w.updatedAt) ?? startedAt,
    exercises,
    pausedAt: iso(w.pausedAt),
    pausedMs: typeof w.pausedMs === 'number' && w.pausedMs >= 0 && Number.isFinite(w.pausedMs) ? w.pausedMs : 0,
    rest: sanitizeRest(w.rest, exercises),
    roundTimer: sanitizeRounds(w.roundTimer, exercises),
  };
}

function sanitizeRest(raw: unknown, exercises: DraftExercise[]): RestTimer | null {
  const r = raw as Partial<RestTimer> | null;
  if (!r || typeof r !== 'object' || !exercises.some((e) => e.uid === r.exUid) || typeof r.setUid !== 'string') return null;
  const startedAt = iso(r.startedAt);
  if (!startedAt || typeof r.durationS !== 'number' || r.durationS < REST_LIMITS.min || r.durationS > REST_LIMITS.max) return null;
  return { exUid: r.exUid!, setUid: r.setUid, startedAt, durationS: r.durationS };
}

function sanitizeRounds(raw: unknown, exercises: DraftExercise[]): RoundTimer | null {
  const t = raw as Partial<RoundTimer> | null;
  if (!t || typeof t !== 'object' || !exercises.some((e) => e.uid === t.exUid)) return null;
  const startedAt = iso(t.startedAt);
  const inRange = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
  if (
    !startedAt ||
    !inRange(t.rounds, ROUND_LIMITS.rounds.min, ROUND_LIMITS.rounds.max) ||
    !inRange(t.roundS, ROUND_LIMITS.roundS.min, ROUND_LIMITS.roundS.max) ||
    !inRange(t.restS, ROUND_LIMITS.restS.min, ROUND_LIMITS.restS.max) ||
    t.prepS !== ROUND_LIMITS.prepS
  ) {
    return null;
  }
  return { exUid: t.exUid!, startedAt, rounds: t.rounds!, roundS: t.roundS!, restS: t.restS!, prepS: t.prepS };
}
