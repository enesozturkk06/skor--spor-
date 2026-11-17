import type { Modality } from '@/features/exercises/types';

import type { ActiveWorkout, RoundTimer } from './types';

/**
 * Pure clock maths for the active workout. Every timer is derived from
 * timestamps (never from a ticking counter), so a reload, a crash or an app
 * kill resumes at exactly the right second, and pausing simply freezes "now".
 */

/** Default rest after a set, by how the exercise is measured. */
export const DEFAULT_REST_S: Record<Modality, number> = { strength: 90, time: 60, cardio: 60, rounds: 60, skill: 45 };

export const REST_LIMITS = { min: 15, max: 600, step: 15 } as const;

export const ROUND_LIMITS = {
  rounds: { min: 1, max: 12, default: 3 },
  roundS: { min: 60, max: 300, step: 30, default: 180 },
  restS: { min: 30, max: 120, step: 15, default: 60 },
  prepS: 10,
} as const;

/** The workout's clock: frozen at the pause moment while paused. */
export const clockMs = (w: Pick<ActiveWorkout, 'pausedAt'>, now: number) => (w.pausedAt ? Date.parse(w.pausedAt) : now);

/** Training time so far (pauses excluded). */
export const elapsedMs = (w: Pick<ActiveWorkout, 'pausedAt' | 'pausedMs' | 'startedAt'>, now: number) =>
  Math.max(0, clockMs(w, now) - Date.parse(w.startedAt) - w.pausedMs);

/** Remaining rest in ms, or null when no rest is running. Never negative. */
export function restRemainingMs(w: Pick<ActiveWorkout, 'pausedAt' | 'rest'>, now: number): number | null {
  if (!w.rest) return null;
  const end = Date.parse(w.rest.startedAt) + w.rest.durationS * 1000;
  return Math.max(0, end - clockMs(w, now));
}

export type RoundPhase = 'prep' | 'round' | 'rest' | 'done';
export type RoundState = {
  phase: RoundPhase;
  /** Current round (1-based); during rest, the round just finished. */
  round: number;
  remainingMs: number;
  phaseMs: number;
  completedRounds: number;
};

export function roundState(t: RoundTimer, clock: number): RoundState {
  const e = clock - Date.parse(t.startedAt);
  const prep = t.prepS * 1000;
  const roundMs = t.roundS * 1000;
  const restMs = t.restS * 1000;
  if (e < prep) return { phase: 'prep', round: 1, remainingMs: prep - Math.max(0, e), phaseMs: prep, completedRounds: 0 };
  const into = e - prep;
  const cycle = roundMs + restMs;
  const k = Math.floor(into / cycle);
  const within = into - k * cycle;
  if (k >= t.rounds || (k === t.rounds - 1 && within >= roundMs)) {
    return { phase: 'done', round: t.rounds, remainingMs: 0, phaseMs: 0, completedRounds: t.rounds };
  }
  if (within < roundMs) return { phase: 'round', round: k + 1, remainingMs: roundMs - within, phaseMs: roundMs, completedRounds: k };
  return { phase: 'rest', round: k + 1, remainingMs: cycle - within, phaseMs: restMs, completedRounds: k + 1 };
}

/** When round n (1-based) ends, as an ISO timestamp (used as the set's completedAt). */
export const roundEndIso = (t: RoundTimer, n: number) =>
  new Date(Date.parse(t.startedAt) + (t.prepS + n * t.roundS + (n - 1) * t.restS) * 1000).toISOString();

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Countdown display: rounds up, so "0:01" shows until the very end. */
export const countdownSeconds = (ms: number) => Math.ceil(ms / 1000);
