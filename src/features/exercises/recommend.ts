import type { GoalId } from '@/features/athlete/catalog';

import type { Exercise, PrescriptionGoal } from './types';

/** Which prescription fits each athlete goal, best first. */
const PREFERENCE: Record<GoalId, PrescriptionGoal[]> = {
  muscle_gain: ['hypertrophy', 'strength'],
  fat_loss: ['conditioning', 'endurance', 'hypertrophy'],
  strength: ['strength', 'power'],
  endurance: ['endurance', 'conditioning'],
  performance: ['power', 'technique', 'strength'],
  competition: ['conditioning', 'power', 'technique'],
  mobility: ['mobility', 'technique'],
  wellness: ['endurance', 'technique', 'mobility'],
};

/**
 * Index of the prescription that best matches the athlete's goals (in the
 * order they chose them), and whether it is a real match or just the default.
 */
export function recommendedPrescription(e: Exercise, goals: readonly GoalId[]): { index: number; matched: boolean } {
  for (const g of goals) {
    for (const want of PREFERENCE[g]) {
      const i = e.prescriptions.findIndex((p) => p.goal === want);
      if (i !== -1) return { index: i, matched: true };
    }
  }
  return { index: 0, matched: false };
}
