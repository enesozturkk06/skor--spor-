import type { IconName } from '@/components/ui/Icon';
import type { BadgeTier } from '@/theme';

import { counted, dayKey, levelFor } from './progress';
import type { WorkoutEntry } from './types';

/**
 * Badges are earned ONLY from the athlete's own logged data — never granted,
 * never estimated. Each rule names the number it counts and the target, so
 * the app can always show the real progress toward an unearned badge.
 * Only complete history may be used (see useInsights().ready): from a partial
 * history a badge could appear and disappear.
 */
export type AchievementMetric = 'workouts' | 'longestStreak' | 'records' | 'level';

export type AchievementRule = {
  id: string;
  label: string;
  /** How it is earned, shown on the badge sheet. */
  rule: string;
  tier: BadgeTier;
  icon: IconName;
  metric: AchievementMetric;
  target: number;
};

export const ACHIEVEMENTS: readonly AchievementRule[] = [
  { id: 'first_workout', label: 'İlk adım', rule: 'İlk antrenmanını kaydet.', tier: 'bronze', icon: 'check', metric: 'workouts', target: 1 },
  { id: 'workouts_10', label: 'Düzenli sporcu', rule: '10 antrenman kaydet.', tier: 'silver', icon: 'calendar-check-outline', metric: 'workouts', target: 10 },
  { id: 'workouts_50', label: 'Disiplin', rule: '50 antrenman kaydet.', tier: 'gold', icon: 'calendar-check-outline', metric: 'workouts', target: 50 },
  { id: 'streak_3', label: 'Seri başladı', rule: '3 gün üst üste antrenman yap.', tier: 'bronze', icon: 'fire', metric: 'longestStreak', target: 3 },
  { id: 'streak_7', label: 'Haftayı kapattın', rule: '7 gün üst üste antrenman yap.', tier: 'gold', icon: 'fire', metric: 'longestStreak', target: 7 },
  { id: 'record_1', label: 'İlk rekor', rule: 'İlk kişisel rekorunu kır.', tier: 'bronze', icon: 'trophy-outline', metric: 'records', target: 1 },
  { id: 'records_10', label: 'Rekor avcısı', rule: '10 kişisel rekor kır.', tier: 'silver', icon: 'trophy-outline', metric: 'records', target: 10 },
  { id: 'level_5', label: 'Seviye 5', rule: 'Seviye 5’e ulaş.', tier: 'silver', icon: 'medal-outline', metric: 'level', target: 5 },
  { id: 'level_10', label: 'Seviye 10', rule: 'Seviye 10’a ulaş.', tier: 'gold', icon: 'medal-outline', metric: 'level', target: 10 },
];

export type AchievementInputs = Record<AchievementMetric, number>;

/** Longest run of consecutive local days with at least one counted workout. */
export function longestStreak(history: readonly WorkoutEntry[]): number {
  const days = [...new Set(counted(history).map((w) => dayKey(new Date(w.startedAt))))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of days) {
    const [y, m, d] = k.split('-').map(Number);
    const day = new Date(y, m - 1, d);
    const next = prev ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1) : null;
    run = next && dayKey(next) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** The numbers the rules count, from history plus the existing record counts and XP total. */
export function achievementInputs(history: readonly WorkoutEntry[], recordCounts: ReadonlyMap<string, number>, totalXp: number): AchievementInputs {
  const done = counted(history);
  return {
    workouts: done.length,
    longestStreak: longestStreak(done),
    records: done.reduce((n, w) => n + (recordCounts.get(w.id) ?? 0), 0),
    level: levelFor(totalXp).level,
  };
}

export type AchievementState = AchievementRule & { earned: boolean; current: number };

export function evaluateAchievements(inputs: AchievementInputs): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const current = inputs[a.metric];
    return { ...a, current, earned: current >= a.target };
  });
}
