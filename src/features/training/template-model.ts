import { isSportId, type SportId } from '@/features/athlete/catalog';
import { getExercise } from '@/features/exercises/catalog';
import { MUSCLES, type MuscleId } from '@/features/exercises/muscles';
import { isUuid, uuid } from '@/lib/uuid';

import { DEFAULT_REST_S, REST_LIMITS, ROUND_LIMITS } from './timers';
import type { ActiveWorkout, DraftExercise, RoundPlan, SetKind, TemplateBlock, TemplateGoal, TemplateSet, Weekday, WorkoutTemplate } from './types';
import { LIMITS as W, WorkoutError, createActiveWorkout } from './workout-model';

/**
 * Programs (workout templates): pure building, validation and conversion.
 * Limits match the planned workout_templates constraints (see the migration
 * draft): name 1–80, notes ≤ 1000, ≤ 40 blocks, days within 1–7.
 */
export const TEMPLATE_LIMITS = { nameMax: 80, notesMax: 1000, blocks: 40, setsPerBlock: 20 } as const;

export const GOALS: readonly TemplateGoal[] = ['strength', 'hypertrophy', 'endurance', 'power', 'technique', 'conditioning', 'mobility'];
const KINDS: readonly SetKind[] = ['normal', 'warmup', 'drop', 'failure'];
const KEY = /^[a-z0-9_]{2,64}$/;

export const WEEKDAYS: readonly { day: Weekday; short: string; long: string }[] = [
  { day: 1, short: 'Pzt', long: 'Pazartesi' },
  { day: 2, short: 'Sal', long: 'Salı' },
  { day: 3, short: 'Çar', long: 'Çarşamba' },
  { day: 4, short: 'Per', long: 'Perşembe' },
  { day: 5, short: 'Cum', long: 'Cuma' },
  { day: 6, short: 'Cmt', long: 'Cumartesi' },
  { day: 7, short: 'Paz', long: 'Pazar' },
];

/** ISO weekday of a date in local time (1 = Monday). */
export const isoWeekday = (d: Date): Weekday => (((d.getDay() + 6) % 7) + 1) as Weekday;

/* ---------------------------------------------------------------- build */

export const blankSet = (kind: SetKind = 'normal'): TemplateSet => ({ kind, reps: null, weightKg: null, durationS: null, distanceM: null });

/** A new block with sensible defaults for how the exercise is measured. */
export function newBlock(exerciseKey: string): TemplateBlock {
  const ex = getExercise(exerciseKey);
  if (!ex) throw new WorkoutError('Bilinmeyen egzersiz.');
  const set = (): TemplateSet => {
    switch (ex.modality) {
      case 'strength':
        return { ...blankSet(), reps: 10 };
      case 'time':
        return { ...blankSet(), durationS: 45 };
      case 'cardio':
        return { ...blankSet(), durationS: 1800 };
      case 'rounds':
        return { ...blankSet(), durationS: 180 };
      case 'skill':
        return { ...blankSet(), reps: 10 };
    }
  };
  const rounds = ex.modality === 'rounds' ? { rounds: 3, roundS: 180, restS: 60 } : null;
  return {
    uid: uuid(),
    exerciseKey: ex.key,
    restS: DEFAULT_REST_S[ex.modality],
    sets: rounds ? [] : [set(), set(), set()],
    rounds,
  };
}

export function blankTemplate(o: { userId: string; sport: SportId }): WorkoutTemplate {
  return {
    id: uuid(),
    userId: o.userId,
    builtIn: false,
    name: '',
    sport: o.sport,
    goal: null,
    notes: null,
    days: [],
    blocks: [],
    updatedAt: new Date().toISOString(),
  };
}

/** A copy owned by the athlete (also how built-in programs are customised). */
export function duplicateTemplate(t: WorkoutTemplate, userId: string, now = new Date()): WorkoutTemplate {
  const suffix = t.builtIn ? '' : ' (kopya)';
  return {
    ...t,
    id: uuid(),
    userId,
    builtIn: false,
    name: `${t.name.slice(0, TEMPLATE_LIMITS.nameMax - suffix.length)}${suffix}`,
    days: t.builtIn ? [] : t.days,
    blocks: t.blocks.map((b) => ({ ...b, uid: uuid(), sets: b.sets.map((s) => ({ ...s })), rounds: b.rounds ? { ...b.rounds } : null })),
    updatedAt: now.toISOString(),
  };
}

export const nextKind = (k: SetKind): SetKind => KINDS[(KINDS.indexOf(k) + 1) % KINDS.length];

export const KIND_META: Record<SetKind, { short: string; label: string }> = {
  normal: { short: '', label: 'Normal set' },
  warmup: { short: 'Ö', label: 'Isınma seti' },
  drop: { short: 'D', label: 'Drop set' },
  failure: { short: 'T', label: 'Tükeniş seti' },
};

/** Moves an item (drag & drop, ↑/↓ buttons). */
export function move<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, item);
  return out;
}

/* -------------------------------------------------------------- validate */

/** User-facing problem that blocks saving, or null. */
export function validateTemplate(t: WorkoutTemplate): string | null {
  if (!t.name.trim()) return 'Programa bir ad ver.';
  if (!t.blocks.length) return 'En az bir egzersiz ekle.';
  if (t.blocks.length > TEMPLATE_LIMITS.blocks) return 'Bir programda en fazla 40 egzersiz olabilir.';
  for (const b of t.blocks) {
    const name = getExercise(b.exerciseKey)?.name.tr ?? b.exerciseKey;
    if (!b.rounds && !b.sets.length) return `${name}: en az bir set ekle.`;
    if (!b.rounds && b.sets.some((s) => s.reps === null && s.durationS === null && s.distanceM === null)) {
      return `${name}: her sete tekrar, süre ya da mesafe gir.`;
    }
  }
  return null;
}

/* ------------------------------------------------------------- sanitize */

const int = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null;
const dec = (v: unknown, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= hi ? Math.round(v * 100) / 100 : null;

function sanitizeRounds(raw: unknown): RoundPlan | null {
  const r = raw as Partial<RoundPlan> | null;
  if (!r || typeof r !== 'object') return null;
  const rounds = int(r.rounds, ROUND_LIMITS.rounds.min, ROUND_LIMITS.rounds.max);
  const roundS = int(r.roundS, ROUND_LIMITS.roundS.min, ROUND_LIMITS.roundS.max);
  const restS = int(r.restS, ROUND_LIMITS.restS.min, ROUND_LIMITS.restS.max);
  return rounds && roundS && restS ? { rounds, roundS, restS } : null;
}

function sanitizeSet(raw: unknown): TemplateSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  return {
    kind: KINDS.includes(s.kind as SetKind) ? (s.kind as SetKind) : 'normal',
    reps: int(s.reps, 0, W.reps),
    weightKg: dec(s.weightKg, W.weightKg),
    durationS: int(s.durationS, 0, W.durationS),
    distanceM: int(s.distanceM, 0, W.distanceM),
  };
}

export function sanitizeBlock(raw: unknown): TemplateBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.exerciseKey !== 'string' || !KEY.test(b.exerciseKey) || !getExercise(b.exerciseKey)) return null;
  const sets = (Array.isArray(b.sets) ? b.sets.slice(0, TEMPLATE_LIMITS.setsPerBlock) : []).map(sanitizeSet).filter((s): s is TemplateSet => s !== null);
  return {
    uid: typeof b.uid === 'string' ? b.uid : uuid(),
    exerciseKey: b.exerciseKey,
    restS: int(b.restS, REST_LIMITS.min, REST_LIMITS.max) ?? DEFAULT_REST_S[getExercise(b.exerciseKey)!.modality],
    sets,
    rounds: sanitizeRounds(b.rounds),
  };
}

const iso = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/** Stored or remote program → trusted shape; another athlete's program is rejected. */
export function sanitizeTemplate(raw: unknown, userId: string): WorkoutTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (!isUuid(t.id) || t.userId !== userId || !isSportId(t.sport)) return null;
  const name = typeof t.name === 'string' ? t.name.trim().slice(0, TEMPLATE_LIMITS.nameMax) : '';
  if (!name) return null;
  const blocks = (Array.isArray(t.blocks) ? t.blocks.slice(0, TEMPLATE_LIMITS.blocks) : []).map(sanitizeBlock).filter((b): b is TemplateBlock => b !== null);
  const days = Array.isArray(t.days) ? [...new Set(t.days.filter((d): d is Weekday => Number.isInteger(d) && d >= 1 && d <= 7))].sort() : [];
  return {
    id: t.id,
    userId,
    builtIn: false,
    name,
    sport: t.sport,
    goal: GOALS.includes(t.goal as TemplateGoal) ? (t.goal as TemplateGoal) : null,
    notes: typeof t.notes === 'string' && t.notes.trim() ? t.notes.slice(0, TEMPLATE_LIMITS.notesMax) : null,
    days,
    blocks,
    updatedAt: iso(t.updatedAt) ?? new Date().toISOString(),
  };
}

/* ------------------------------------------------------- database rows */

export type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  sport: string;
  goal: string | null;
  notes: string | null;
  days: number[];
  blocks: {
    exercise_key: string;
    rest_s: number;
    sets: { kind: string; reps: number | null; weight_kg: number | null; duration_s: number | null; distance_m: number | null }[];
    rounds: { rounds: number; round_s: number; rest_s: number } | null;
  }[];
  updated_at?: string;
};

/** What the client writes. user_id must equal the session user (RLS); timestamps are the server's. */
export function toTemplateRow(t: WorkoutTemplate): TemplateRow {
  return {
    id: t.id,
    user_id: t.userId!,
    name: t.name.trim(),
    sport: t.sport,
    goal: t.goal,
    notes: t.notes,
    days: t.days,
    blocks: t.blocks.map((b) => ({
      exercise_key: b.exerciseKey,
      rest_s: b.restS,
      sets: b.sets.map((s) => ({ kind: s.kind, reps: s.reps, weight_kg: s.weightKg, duration_s: s.durationS, distance_m: s.distanceM })),
      rounds: b.rounds ? { rounds: b.rounds.rounds, round_s: b.rounds.roundS, rest_s: b.rounds.restS } : null,
    })),
  };
}

export function fromTemplateRow(r: TemplateRow, userId: string): WorkoutTemplate | null {
  return sanitizeTemplate(
    {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      sport: r.sport,
      goal: r.goal,
      notes: r.notes,
      days: r.days,
      updatedAt: r.updated_at,
      blocks: (r.blocks ?? []).map((b) => ({
        exerciseKey: b.exercise_key,
        restS: b.rest_s,
        sets: (b.sets ?? []).map((s) => ({ kind: s.kind, reps: s.reps, weightKg: s.weight_kg === null ? null : Number(s.weight_kg), durationS: s.duration_s, distanceM: s.distance_m })),
        rounds: b.rounds ? { rounds: b.rounds.rounds, roundS: b.rounds.round_s, restS: b.rounds.rest_s } : null,
      })),
    },
    userId,
  );
}

/* --------------------------------------------------------------- summary */

/** Rough length: work time per set + rest between sets; rounds as planned. */
export function estimateMinutes(t: Pick<WorkoutTemplate, 'blocks'>): number {
  let s = 0;
  for (const b of t.blocks) {
    if (b.rounds) {
      s += ROUND_LIMITS.prepS + b.rounds.rounds * b.rounds.roundS + (b.rounds.rounds - 1) * b.rounds.restS;
      continue;
    }
    for (const set of b.sets) s += (set.durationS ?? (set.reps ? 40 : 30)) + b.restS;
    s += 60; // setting up the next exercise
  }
  return Math.max(1, Math.round(s / 60));
}

export const totalSets = (t: Pick<WorkoutTemplate, 'blocks'>) => t.blocks.reduce((n, b) => n + (b.rounds ? b.rounds.rounds : b.sets.length), 0);

/** Muscles the program trains: primary anywhere wins over secondary. */
export function programMuscles(t: Pick<WorkoutTemplate, 'blocks'>): { primary: MuscleId[]; secondary: MuscleId[] } {
  const primary = new Set<MuscleId>();
  const secondary = new Set<MuscleId>();
  for (const b of t.blocks) {
    const ex = getExercise(b.exerciseKey);
    ex?.primary.forEach((m) => primary.add(m));
    ex?.secondary.forEach((m) => secondary.add(m));
  }
  const order = Object.keys(MUSCLES) as MuscleId[];
  return { primary: order.filter((m) => primary.has(m)), secondary: order.filter((m) => secondary.has(m) && !primary.has(m)) };
}

/* ----------------------------------------------------------------- start */

/**
 * A workout ready to log from a program: planned values pre-filled (not done),
 * set types kept, rest per exercise, round plans ready for the round clock.
 * Only the athlete's own (saved) programs are linked by id.
 */
export function activeFromTemplate(t: WorkoutTemplate, userId: string, now = new Date()): ActiveWorkout {
  const w = createActiveWorkout({ userId, name: t.name, sport: t.sport, now, templateId: t.builtIn ? null : t.id });
  const exercises: DraftExercise[] = t.blocks.slice(0, W.exercisesPerWorkout).map((b) => {
    const ex = getExercise(b.exerciseKey)!;
    const planned = b.rounds
      ? Array.from({ length: b.rounds.rounds }, () => ({ ...blankSet(), durationS: b.rounds!.roundS }))
      : b.sets;
    return {
      uid: uuid(),
      exerciseKey: ex.key,
      exerciseName: ex.name.tr,
      restS: b.restS,
      plannedRounds: b.rounds,
      sets: planned.slice(0, W.setsPerExercise).map((s) => ({
        uid: uuid(),
        kind: s.kind,
        reps: s.reps,
        weightKg: s.weightKg,
        durationS: s.durationS,
        distanceM: s.distanceM,
        restS: null,
        rpe: null,
        done: false,
        completedAt: null,
      })),
    };
  });
  return { ...w, exercises };
}
