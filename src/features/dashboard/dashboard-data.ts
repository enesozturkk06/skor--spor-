import { getSport, type GoalId } from '@/features/athlete/catalog';
import type { AthleteProfile } from '@/features/athlete/types';

import { computeAthleteScore, type ScoreBreakdown } from './athlete-score';

export type WeekDay = { label: string; minutes: number; isToday: boolean; isFuture: boolean };

export type DashboardSnapshot = {
  /** True while activity tracking is not live — UI must disclose this. */
  isSample: boolean;
  week: WeekDay[];
  todayMinutes: number;
  dailyTargetMinutes: number;
  streakDays: number;
  stats: { sessions: number; minutes: number; calories: number; avgIntensity: number };
  nutrition: {
    kcal: number;
    kcalTarget: number;
    macros: { key: 'protein' | 'carbs' | 'fat'; label: string; grams: number; target: number }[];
  };
  recovery: { readiness: number; sleepHours: number; restingHr: number; status: string };
  score: ScoreBreakdown;
  scoreDelta: number;
};

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Sample training minutes per weekday until real tracking ships. */
const SAMPLE_MINUTES = [52, 0, 64, 45, 70, 38, 55];
const SAMPLE_TODAY_PARTIAL = 32;

const DAILY_TARGET_BY_CATEGORY = { strength: 50, combat: 60, team: 60, endurance: 45, racket: 50 } as const;

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

function streakFrom(week: WeekDay[], todayIndex: number): number {
  let streak = 0;
  // Today counts if trained; otherwise start from yesterday.
  let i = week[todayIndex].minutes > 0 ? todayIndex : todayIndex - 1;
  while (i >= 0 && week[i].minutes > 0) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

export function buildDashboardSnapshot(profile: AthleteProfile, now = new Date()): DashboardSnapshot {
  const todayIndex = (now.getDay() + 6) % 7; // Monday = 0
  const week: WeekDay[] = DAY_LABELS.map((label, i) => ({
    label,
    minutes: i < todayIndex ? SAMPLE_MINUTES[i] : i === todayIndex ? SAMPLE_TODAY_PARTIAL : 0,
    isToday: i === todayIndex,
    isFuture: i > todayIndex,
  }));

  const dailyTargetMinutes = DAILY_TARGET_BY_CATEGORY[getSport(profile.primarySport).category];
  const weekMinutes = week.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = week.filter((d) => d.minutes > 0).length;
  const sessions = activeDays;

  const target = kcalTarget(profile.weightKg, profile.goals);
  const macros = macroTargets(profile.weightKg, target, profile.goals);
  const nutrition: DashboardSnapshot['nutrition'] = {
    kcal: Math.round(target * 0.62),
    kcalTarget: target,
    macros: [
      { key: 'protein', label: 'Protein', grams: Math.round(macros.protein * 0.7), target: macros.protein },
      { key: 'carbs', label: 'Karbonhidrat', grams: Math.round(macros.carbs * 0.58), target: macros.carbs },
      { key: 'fat', label: 'Yağ', grams: Math.round(macros.fat * 0.55), target: macros.fat },
    ],
  };

  const recovery = { readiness: 78, sleepHours: 7.2, restingHr: 56, status: 'Antrenmana hazır' };

  const score = computeAthleteScore({
    activeDays,
    weeklyMinutes: weekMinutes,
    weeklyTargetMinutes: dailyTargetMinutes * 5,
    recovery: recovery.readiness,
    nutritionAdherence: 0.71,
  });

  return {
    isSample: true,
    week,
    todayMinutes: week[todayIndex].minutes,
    dailyTargetMinutes,
    streakDays: streakFrom(week, todayIndex),
    stats: {
      sessions,
      minutes: weekMinutes,
      // ~7 kcal/min is a mid-intensity average across sports.
      calories: Math.round(weekMinutes * 7.2),
      avgIntensity: 7.4,
    },
    nutrition,
    recovery,
    score,
    scoreDelta: 3,
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
