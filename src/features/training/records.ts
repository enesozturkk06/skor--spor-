import { getExercise } from '@/features/exercises/catalog';
import type { Modality } from '@/features/exercises/types';

import type { LoggedSet, Workout, WorkoutEntry } from './types';

/**
 * Personal records, derived from finished workouts (never stored, so they
 * can't go stale and need no table). Each record kind is its own metric:
 * a heavier single and a longer plank are never compared with each other.
 *
 * Extending to new sports = adding a metric here (and to METRICS_BY_MODALITY):
 * e.g. sprint time, jump height, swim pace per 100 m.
 */
export type RecordMetric =
  | 'e1rm' // estimated 1RM, Epley, sets of 1–12 reps with load
  | 'weight' // heaviest load lifted for ≥ 1 rep
  | 'reps' // most reps in one set (bodyweight / skill)
  | 'volume' // most kg × reps in one session
  | 'duration' // longest set (holds, intervals)
  | 'distance' // longest distance in one set
  | 'pace' // fastest pace (s per km), sets of ≥ 400 m — lower is better
  | 'rounds'; // most rounds in one session

export const METRIC_META: Record<RecordMetric, { label: string; better: 'higher' | 'lower'; unit: string }> = {
  e1rm: { label: 'Tahmini 1RM', better: 'higher', unit: 'kg' },
  weight: { label: 'En ağır', better: 'higher', unit: 'kg' },
  reps: { label: 'En çok tekrar', better: 'higher', unit: 'tekrar' },
  volume: { label: 'Seans hacmi', better: 'higher', unit: 'kg' },
  duration: { label: 'En uzun süre', better: 'higher', unit: 'sn' },
  distance: { label: 'En uzun mesafe', better: 'higher', unit: 'm' },
  pace: { label: 'En hızlı tempo', better: 'lower', unit: 'sn/km' },
  rounds: { label: 'En çok raund', better: 'higher', unit: 'raund' },
};

export const METRICS_BY_MODALITY: Record<Modality, RecordMetric[]> = {
  strength: ['e1rm', 'weight', 'reps', 'volume'],
  time: ['duration'],
  cardio: ['distance', 'pace', 'duration'],
  rounds: ['rounds'],
  skill: ['reps', 'duration'],
};

/** Epley: w × (1 + reps / 30), only for 1–12 reps with a load. */
export function epley(weightKg: number, reps: number): number | null {
  if (!(weightKg > 0) || !Number.isInteger(reps) || reps < 1 || reps > 12) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** Sets that count for records: completed (all logged sets are), not warm-ups. */
const working = (sets: readonly LoggedSet[]) => sets.filter((s) => s.kind !== 'warmup');

/** Best value of each metric for one exercise inside one workout. */
export function sessionBests(w: Pick<Workout, 'sets'>, exerciseKey: string): Partial<Record<RecordMetric, number>> {
  const ex = getExercise(exerciseKey);
  const metrics = METRICS_BY_MODALITY[ex?.modality ?? 'strength'];
  const sets = working(w.sets.filter((s) => s.exerciseKey === exerciseKey));
  const out: Partial<Record<RecordMetric, number>> = {};
  const best = (m: RecordMetric, v: number | null) => {
    if (v === null || !Number.isFinite(v) || v <= 0 || !metrics.includes(m)) return;
    const cur = out[m];
    out[m] = cur === undefined ? v : METRIC_META[m].better === 'higher' ? Math.max(cur, v) : Math.min(cur, v);
  };
  let volume = 0;
  for (const s of sets) {
    if (s.weightKg && s.reps) {
      best('e1rm', epley(s.weightKg, s.reps));
      best('weight', s.weightKg);
      volume += s.weightKg * s.reps;
    }
    // Rep records only where reps are the whole story (no load), so 20 light
    // reps never "beat" 5 heavy ones.
    if (s.reps && !s.weightKg) best('reps', s.reps);
    if (s.durationS && ex?.modality !== 'rounds') best('duration', s.durationS);
    if (s.distanceM) best('distance', s.distanceM);
    if (s.distanceM && s.distanceM >= 400 && s.durationS) best('pace', Math.round((s.durationS / s.distanceM) * 1000));
  }
  best('volume', Math.round(volume));
  if (ex?.modality === 'rounds') best('rounds', sets.length);
  return out;
}

export type PersonalRecord = {
  exerciseKey: string;
  metric: RecordMetric;
  value: number;
  workoutId: string;
  workoutName: string;
  /** When it happened (workout end). */
  at: string;
};

const counts = (e: WorkoutEntry) => e.sync !== 'rejected';
const byTime = (a: WorkoutEntry, b: WorkoutEntry) => Date.parse(a.endedAt) - Date.parse(b.endedAt);
const beats = (m: RecordMetric, v: number, old: number) => (METRIC_META[m].better === 'higher' ? v > old : v < old);

/** Current record per exercise and metric (the first workout to reach it keeps it). */
export function computeRecords(history: readonly WorkoutEntry[]): Map<string, PersonalRecord[]> {
  const best = new Map<string, PersonalRecord>();
  for (const w of [...history].filter(counts).sort(byTime)) {
    for (const key of new Set(w.sets.map((s) => s.exerciseKey))) {
      const b = sessionBests(w, key);
      for (const m of Object.keys(b) as RecordMetric[]) {
        const id = `${key}|${m}`;
        const cur = best.get(id);
        if (!cur || beats(m, b[m]!, cur.value)) best.set(id, { exerciseKey: key, metric: m, value: b[m]!, workoutId: w.id, workoutName: w.name, at: w.endedAt });
      }
    }
  }
  const out = new Map<string, PersonalRecord[]>();
  for (const r of best.values()) out.set(r.exerciseKey, [...(out.get(r.exerciseKey) ?? []), r]);
  return out;
}

export type RecordEvent = {
  exerciseKey: string;
  metric: RecordMetric;
  value: number;
  /** null: first time this metric was measured (a baseline, not a "beaten" record). */
  previous: number | null;
};

/** What a workout achieved against everything finished before it. */
export function recordsSetBy(workout: Workout, history: readonly WorkoutEntry[]): { records: RecordEvent[]; firsts: RecordEvent[] } {
  const before = history.filter((e) => e.id !== workout.id && counts(e) && Date.parse(e.endedAt) < Date.parse(workout.endedAt));
  const prior = computeRecords(before);
  const records: RecordEvent[] = [];
  const firsts: RecordEvent[] = [];
  for (const key of new Set(workout.sets.map((s) => s.exerciseKey))) {
    const b = sessionBests(workout, key);
    const old = new Map((prior.get(key) ?? []).map((r) => [r.metric, r.value]));
    for (const m of Object.keys(b) as RecordMetric[]) {
      const prev = old.get(m);
      if (prev === undefined) firsts.push({ exerciseKey: key, metric: m, value: b[m]!, previous: null });
      else if (beats(m, b[m]!, prev)) records.push({ exerciseKey: key, metric: m, value: b[m]!, previous: prev });
    }
  }
  return { records, firsts };
}

/** "92,5 kg", "12 tekrar", "1:30", "5,2 km", "4:55 /km", "6 raund". */
export function formatRecord(metric: RecordMetric, value: number): string {
  const n = (v: number, d = 1) => v.toLocaleString('tr-TR', { maximumFractionDigits: d });
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  switch (metric) {
    case 'e1rm':
    case 'weight':
      return `${n(value, 2)} kg`;
    case 'volume':
      return `${n(value, 0)} kg`;
    case 'reps':
      return `${value} tekrar`;
    case 'duration':
      return value >= 60 ? `${clock(value)} dk` : `${value} sn`;
    case 'distance':
      return value >= 1000 ? `${n(value / 1000, 2)} km` : `${value} m`;
    case 'pace':
      return `${clock(value)} /km`;
    case 'rounds':
      return `${value} raund`;
  }
}

/**
 * How many records each workout beat at the time it was done (firsts don't
 * count). One pass over the history, oldest first.
 */
export function recordCountsByWorkout(history: readonly WorkoutEntry[]): Map<string, number> {
  const best = new Map<string, number>();
  const out = new Map<string, number>();
  for (const w of [...history].filter(counts).sort(byTime)) {
    let n = 0;
    for (const key of new Set(w.sets.map((s) => s.exerciseKey))) {
      const b = sessionBests(w, key);
      for (const m of Object.keys(b) as RecordMetric[]) {
        const id = `${key}|${m}`;
        const cur = best.get(id);
        if (cur === undefined) best.set(id, b[m]!);
        else if (beats(m, b[m]!, cur)) {
          best.set(id, b[m]!);
          n += 1;
        }
      }
    }
    out.set(w.id, n);
  }
  return out;
}
