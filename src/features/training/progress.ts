import { getExercise } from '@/features/exercises/catalog';

import type { Workout, WorkoutEntry } from './types';
import { durationMinutes } from './workout-model';

/**
 * Pure analytics over finished workouts: per-workout stats, comparisons,
 * XP / level, and the day-by-day activity the dashboard and Athlete Score
 * use. Everything is derived from the workout list — no extra storage.
 * Rejected workouts (refused by the server) never count.
 */

export const counted = (h: readonly WorkoutEntry[]) => h.filter((e) => e.sync !== 'rejected');

/* ----------------------------------------------------------- one workout */

export type WorkoutStats = {
  minutes: number;
  sets: number;
  reps: number;
  /** kg × reps of loaded sets (warm-ups excluded). */
  volumeKg: number;
  exercises: number;
  rounds: number;
  distanceM: number;
};

export function workoutStats(w: Workout): WorkoutStats {
  let reps = 0;
  let volume = 0;
  let rounds = 0;
  let distance = 0;
  for (const s of w.sets) {
    reps += s.reps ?? 0;
    if (s.kind !== 'warmup' && s.weightKg && s.reps) volume += s.weightKg * s.reps;
    if (getExercise(s.exerciseKey)?.modality === 'rounds') rounds += 1;
    distance += s.distanceM ?? 0;
  }
  return {
    minutes: durationMinutes(w),
    sets: w.sets.length,
    reps,
    volumeKg: Math.round(volume),
    exercises: new Set(w.sets.map((s) => s.exerciseKey)).size,
    rounds,
    distanceM: distance,
  };
}

/**
 * The workout to compare against: the latest earlier one from the same
 * program, else with the same name, else of the same sport.
 */
export function previousComparable(w: Workout, history: readonly WorkoutEntry[]): WorkoutEntry | null {
  const earlier = counted(history)
    .filter((e) => e.id !== w.id && Date.parse(e.endedAt) < Date.parse(w.endedAt))
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
  return (
    (w.templateId ? earlier.find((e) => e.templateId === w.templateId) : undefined) ??
    earlier.find((e) => e.name === w.name) ??
    earlier.find((e) => e.sport === w.sport) ??
    null
  );
}

/* ---------------------------------------------------------------- XP */

/**
 * XP rewards showing up and doing the work, plus records:
 * 50 per workout + 2 per set + 1 per 5 minutes + 25 per new record.
 */
export const XP_RULES = { workout: 50, set: 2, perFiveMinutes: 1, record: 25 } as const;

export function workoutXp(w: Workout, newRecords: number): number {
  const s = workoutStats(w);
  return XP_RULES.workout + s.sets * XP_RULES.set + Math.floor(s.minutes / 5) * XP_RULES.perFiveMinutes + newRecords * XP_RULES.record;
}

/** Level n needs 100·n² XP in total (1: 0, 2: 100, 3: 400, 4: 900 …): early levels come fast. */
export function levelFor(xp: number): { level: number; into: number; span: number; progress: number } {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const start = 100 * (level - 1) ** 2;
  const end = 100 * level ** 2;
  return { level, into: xp - start, span: end - start, progress: (xp - start) / (end - start) };
}

/* ---------------------------------------------------------- calendar */

/** Local calendar day key "2026-11-17" (workouts count on the day they started). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Monday 00:00 of the week containing `d` (local time). */
export function weekStart(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

/** Training minutes per local day. */
export function minutesByDay(history: readonly WorkoutEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of counted(history)) {
    const k = dayKey(new Date(w.startedAt));
    m.set(k, (m.get(k) ?? 0) + Math.max(1, durationMinutes(w)));
  }
  return m;
}

/** Consecutive active days ending today (or yesterday, if today is still open). */
export function streakDays(history: readonly WorkoutEntry[], now = new Date()): number {
  const days = minutesByDay(history);
  let d = days.has(dayKey(now)) ? now : addDays(now, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

export type Window = { from: Date; to: Date };
export const lastDays = (n: number, now = new Date()): Window => ({ from: addDays(now, -(n - 1)), to: now });

export function inWindow(history: readonly WorkoutEntry[], w: Window): WorkoutEntry[] {
  const from = new Date(w.from.getFullYear(), w.from.getMonth(), w.from.getDate()).getTime();
  const to = w.to.getTime();
  return counted(history).filter((e) => {
    const t = Date.parse(e.startedAt);
    return t >= from && t <= to;
  });
}

export function activeDaysIn(history: readonly WorkoutEntry[], w: Window): number {
  return new Set(inWindow(history, w).map((e) => dayKey(new Date(e.startedAt)))).size;
}

export const minutesIn = (history: readonly WorkoutEntry[], w: Window) => inWindow(history, w).reduce((n, e) => n + durationMinutes(e), 0);

/** XP gained by each workout and the running total after it (oldest first). */
export function xpTimeline(history: readonly WorkoutEntry[], recordCounts: Map<string, number>): Map<string, { gained: number; totalAfter: number }> {
  const out = new Map<string, { gained: number; totalAfter: number }>();
  let total = 0;
  for (const w of counted(history).sort((a, b) => Date.parse(a.endedAt) - Date.parse(b.endedAt))) {
    const gained = workoutXp(w, recordCounts.get(w.id) ?? 0);
    total += gained;
    out.set(w.id, { gained, totalAfter: total });
  }
  return out;
}
