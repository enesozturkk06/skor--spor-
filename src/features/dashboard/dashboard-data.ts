import { getSport, type GoalId } from '@/features/athlete/catalog';
import type { AthleteProfile } from '@/features/athlete/types';
import { dayKey, inWindow, minutesByDay, streakDays, weekStart } from '@/features/training/progress';
import type { WorkoutEntry } from '@/features/training/types';
import { durationMinutes } from '@/features/training/workout-model';

import { SCORE_WINDOW_DAYS, computeTrainingScore, type TrainingScore } from './athlete-score';

/** How much of the history is on the device (it is loaded newest first, page by page). */
export type HistoryCoverage = { complete: boolean; loadedUntil: string | null };

export type WeekDay = { label: string; minutes: number; isToday: boolean; isFuture: boolean };

/**
 * Everything on the home screen. Training numbers come from the athlete's
 * logged workouts. Nutrition and recovery are not tracked yet: only the
 * targets derived from the profile are shown, never invented intake or
 * readiness values.
 */
export type DashboardSnapshot = {
  week: WeekDay[];
  todayMinutes: number;
  dailyTargetMinutes: number;
  streakDays: number;
  /** This calendar week (Mon–Sun). avgRpe is null when no workout had an RPE. */
  stats: { sessions: number; minutes: number; sets: number; avgRpe: number | null };
  /** Targets only (from weight and goals). */
  nutrition: { kcalTarget: number; macros: { key: 'protein' | 'carbs' | 'fat'; label: string; target: number }[] };
  score: TrainingScore;
  /** True when the athlete has never finished a workout. */
  empty: boolean;
};

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const DAILY_TARGET_BY_CATEGORY = { strength: 50, combat: 60, team: 60, endurance: 45, racket: 50 } as const;
/** Training days per week that give full "frequency" marks. */
export const TARGET_DAYS = 4;

/** Goal-based kcal multiplier on a simple maintenance estimate. */
function kcalTarget(weightKg: number, goals: GoalId[]): number {
  const maintenance = weightKg * 31;
  const factor = goals.includes('fat_loss') ? 0.85 : goals.includes('muscle_gain') ? 1.1 : 1;
  return Math.round((maintenance * factor) / 10) * 10;
}

function macroTargets(weightKg: number, kcal: number, goals: GoalId[]) {
  const proteinPerKg = goals.includes('muscle_gain') || goals.includes('strength') ? 2 : 1.6;
  const protein = Math.round(weightKg * proteinPerKg);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

export function buildDashboardSnapshot(
  profile: AthleteProfile,
  history: readonly WorkoutEntry[],
  now = new Date(),
  coverage: HistoryCoverage = { complete: true, loadedUntil: null },
): DashboardSnapshot {
  // Every workout the score reads must be loaded — never a score from part of the window.
  const windowStart = now.getTime() - SCORE_WINDOW_DAYS * 86_400_000;
  const covered = coverage.complete || (coverage.loadedUntil !== null && Date.parse(coverage.loadedUntil) <= windowStart);
  const monday = weekStart(now);
  const todayIndex = (now.getDay() + 6) % 7;
  const byDay = minutesByDay(history);
  const week: WeekDay[] = DAY_LABELS.map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { label, minutes: i > todayIndex ? 0 : (byDay.get(dayKey(d)) ?? 0), isToday: i === todayIndex, isFuture: i > todayIndex };
  });

  const dailyTargetMinutes = DAILY_TARGET_BY_CATEGORY[getSport(profile.primarySport).category];
  const thisWeek = inWindow(history, { from: monday, to: now });
  const rpes = thisWeek.map((w) => w.rpe).filter((r): r is number => r !== null);

  const target = kcalTarget(profile.weightKg, profile.goals);
  const macros = macroTargets(profile.weightKg, target, profile.goals);

  return {
    week,
    todayMinutes: week[todayIndex].minutes,
    dailyTargetMinutes,
    streakDays: streakDays(history, now),
    stats: {
      sessions: thisWeek.length,
      minutes: thisWeek.reduce((n, w) => n + durationMinutes(w), 0),
      sets: thisWeek.reduce((n, w) => n + w.sets.length, 0),
      avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
    },
    nutrition: {
      kcalTarget: target,
      macros: [
        { key: 'protein', label: 'Protein', target: macros.protein },
        { key: 'carbs', label: 'Karbonhidrat', target: macros.carbs },
        { key: 'fat', label: 'Yağ', target: macros.fat },
      ],
    },
    score: covered
      ? computeTrainingScore(history, { targetDays: TARGET_DAYS, weeklyTargetMinutes: dailyTargetMinutes * TARGET_DAYS }, now)
      : { status: 'loading' },
    empty: !history.some((e) => e.sync !== 'rejected'),
  };
}

const MOTIVATION = [
  'Disiplin, motivasyonun bittiği yerde başlar.',
  'Bugünkü ter, yarınki skorun.',
  'Küçük adımlar, büyük dereceler.',
  'Rakibin dinlenirken sen çalış.',
  'Performansın, alışkanlıklarının toplamıdır.',
  'Zor antrenman, kolay maç.',
  'Toparlanmak da antrenmanın parçası.',
];

export function motivationOfTheDay(now = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return MOTIVATION[dayOfYear % MOTIVATION.length];
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}
