import type { SportId } from '@/features/athlete/catalog';

import type { MuscleId } from './muscles';

/**
 * How a set of this exercise is measured. Drives the set-row UI of the
 * workout logger (Phase 3C) and maps onto workout_sets columns:
 *   strength → reps + weight_kg   time   → duration_s
 *   cardio   → distance_m + duration_s
 *   rounds   → duration_s per round (+ rest_s)   skill → reps or duration_s
 */
export type Modality = 'strength' | 'time' | 'cardio' | 'rounds' | 'skill';

export type ExerciseCategory = 'strength' | 'conditioning' | 'combat' | 'endurance' | 'athletic' | 'mobility';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bench'
  | 'pullup_bar'
  | 'bodyweight'
  | 'heavy_bag'
  | 'jump_rope'
  | 'box'
  | 'medicine_ball'
  | 'pool'
  | 'kickboard'
  | 'track';

export type PrescriptionGoal =
  | 'strength'
  | 'hypertrophy'
  | 'endurance'
  | 'power'
  | 'technique'
  | 'conditioning'
  | 'mobility';

/** One evidence-based starting point, e.g. "Hipertrofi · 3–4 set · 8–12 tekrar · 90 sn". */
export type Prescription = {
  goal: PrescriptionGoal;
  sets: string;
  /** Reps, time, distance or rounds — already formatted for display. */
  target: string;
  rest: string;
};

export type Exercise = {
  /** Stable id stored in workout_sets.exercise_key (^[a-z0-9_]{2,64}$). Never rename. */
  key: string;
  name: { tr: string; en: string };
  category: ExerciseCategory;
  modality: Modality;
  level: Level;
  equipment: Equipment[];
  primary: MuscleId[];
  secondary: MuscleId[];
  sports: SportId[];
  /** One-line summary shown on cards. */
  summary: string;
  /** Technique, in order. */
  steps: string[];
  breathing: string;
  mistakes: string[];
  prescriptions: Prescription[];
};
