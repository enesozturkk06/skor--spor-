/**
 * Athlete Score (0–100): one number summarising how well an athlete is
 * training, recovering and fuelling. Kept pure so it can later run on the
 * server with real data and be unit-tested.
 */
export type ScoreInputs = {
  /** Active days in the last 7 days. */
  activeDays: number;
  /** Training minutes this week vs. weekly target. */
  weeklyMinutes: number;
  weeklyTargetMinutes: number;
  /** 0–100 readiness from recovery data. */
  recovery: number;
  /** 0–1 share of days nutrition targets were met. */
  nutritionAdherence: number;
};

export type ScoreBreakdown = {
  total: number;
  training: number;
  recovery: number;
  nutrition: number;
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export const SCORE_WEIGHTS = { training: 0.45, recovery: 0.3, nutrition: 0.25 } as const;

export function computeAthleteScore(i: ScoreInputs): ScoreBreakdown {
  const consistency = clamp((i.activeDays / 5) * 100); // 5 active days = full marks
  const volume = i.weeklyTargetMinutes > 0 ? clamp((i.weeklyMinutes / i.weeklyTargetMinutes) * 100) : 0;
  const training = Math.round(consistency * 0.5 + volume * 0.5);
  const recovery = Math.round(clamp(i.recovery));
  const nutrition = Math.round(clamp(i.nutritionAdherence * 100));
  const total = Math.round(
    training * SCORE_WEIGHTS.training + recovery * SCORE_WEIGHTS.recovery + nutrition * SCORE_WEIGHTS.nutrition,
  );
  return { total, training, recovery, nutrition };
}

export function scoreTier(score: number): { label: string; tone: 'orange' | 'gold' | 'success' } {
  if (score >= 85) return { label: 'Elit', tone: 'gold' };
  if (score >= 70) return { label: 'Güçlü', tone: 'success' };
  if (score >= 50) return { label: 'Gelişiyor', tone: 'orange' };
  return { label: 'Başlangıç', tone: 'orange' };
}
