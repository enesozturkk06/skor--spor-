import { activeDaysIn, counted, inWindow, lastDays, minutesIn } from '@/features/training/progress';
import { recordCountsByWorkout } from '@/features/training/records';
import type { WorkoutEntry } from '@/features/training/types';

/**
 * Athlete Score (0–100): how well an athlete trains, recovers and fuels.
 *
 * Today only the TRAINING pillar has real data (logged workouts). Recovery
 * and nutrition modules are not live, so they are shown as "coming soon" and
 * are NOT part of the number — no sample values are ever mixed in. Once they
 * ship, the total becomes the weighted mix below.
 *
 * Kept pure (history + clock in, numbers out) so it can be unit-tested and
 * later computed on the server with the same rules.
 */
export const SCORE_WEIGHTS = { training: 0.45, recovery: 0.3, nutrition: 0.25 } as const;

/** No score before this many workouts: a number from 1–2 sessions would mislead. */
export const CALIBRATION_WORKOUTS = 3;

export type ScoreComponentKey = 'frequency' | 'volume' | 'consistency' | 'progress';

export type ScoreComponent = {
  key: ScoreComponentKey;
  label: string;
  /** 0–100 */
  value: number;
  weight: number;
  /** Plain-language basis, e.g. "3 / 4 gün · son 7 gün". */
  detail: string;
};

/**
 * Days of history the score reads: the 28-day window of its components plus
 * 7 days for the week-over-week change. The score waits until all of it is
 * loaded (history arrives page by page).
 */
export const SCORE_WINDOW_DAYS = 35;

export type TrainingScore =
  | { status: 'loading' }
  | { status: 'calibrating'; workouts: number; needed: number }
  | { status: 'ready'; total: number; components: ScoreComponent[]; delta: number | null; workouts: number };

export type ScoreTargets = {
  /** Active days per week that count as "full marks". */
  targetDays: number;
  weeklyTargetMinutes: number;
};

const COMPONENT_WEIGHTS: Record<ScoreComponentKey, number> = { frequency: 0.3, volume: 0.3, consistency: 0.25, progress: 0.15 };
const RECORDS_FOR_FULL_PROGRESS = 3;

const pct = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);
const shift = (d: Date, days: number) => new Date(d.getTime() - days * 86_400_000);

function scoreAt(history: readonly WorkoutEntry[], targets: ScoreTargets, now: Date, recordCounts: Map<string, number>): TrainingScore {
  const upToNow = counted(history).filter((e) => Date.parse(e.startedAt) <= now.getTime());
  if (upToNow.length < CALIBRATION_WORKOUTS) return { status: 'calibrating', workouts: upToNow.length, needed: CALIBRATION_WORKOUTS };

  const week = lastDays(7, now);
  const days = activeDaysIn(upToNow, week);
  const minutes = minutesIn(upToNow, week);
  // Regular = at least 2 workouts in each of the last four 7-day windows.
  const regularWeeks = [0, 7, 14, 21].filter((back) => inWindow(upToNow, lastDays(7, shift(now, back))).length >= 2).length;
  const records = inWindow(upToNow, lastDays(28, now)).reduce((n, e) => n + (recordCounts.get(e.id) ?? 0), 0);

  const components: ScoreComponent[] = [
    { key: 'frequency', label: 'Sıklık', value: pct(days / targets.targetDays), weight: COMPONENT_WEIGHTS.frequency, detail: `${days} / ${targets.targetDays} gün · son 7 gün` },
    { key: 'volume', label: 'Süre', value: pct(minutes / targets.weeklyTargetMinutes), weight: COMPONENT_WEIGHTS.volume, detail: `${minutes} / ${targets.weeklyTargetMinutes} dk · son 7 gün` },
    { key: 'consistency', label: 'Devamlılık', value: pct(regularWeeks / 4), weight: COMPONENT_WEIGHTS.consistency, detail: `${regularWeeks} / 4 hafta düzenli (haftada 2+ antrenman)` },
    { key: 'progress', label: 'Gelişim', value: pct(records / RECORDS_FOR_FULL_PROGRESS), weight: COMPONENT_WEIGHTS.progress, detail: `${records} kişisel rekor · son 4 hafta` },
  ];
  const total = Math.round(components.reduce((s, c) => s + c.value * c.weight, 0));
  return { status: 'ready', total, components, delta: null, workouts: upToNow.length };
}

/** Training score now, with the change against 7 days ago (when it was already calibrated then). */
export function computeTrainingScore(history: readonly WorkoutEntry[], targets: ScoreTargets, now = new Date()): TrainingScore {
  const recordCounts = recordCountsByWorkout(history);
  const current = scoreAt(history, targets, now, recordCounts);
  if (current.status !== 'ready') return current;
  const before = scoreAt(history, targets, shift(now, 7), recordCounts);
  return { ...current, delta: before.status === 'ready' ? current.total - before.total : null };
}

export function scoreTier(score: number): { label: string; tone: 'orange' | 'gold' | 'success' } {
  if (score >= 85) return { label: 'Elit', tone: 'gold' };
  if (score >= 70) return { label: 'Güçlü', tone: 'success' };
  if (score >= 50) return { label: 'Gelişiyor', tone: 'orange' };
  return { label: 'Başlangıç', tone: 'orange' };
}
