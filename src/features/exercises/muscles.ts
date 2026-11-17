/**
 * Muscles shown on the 2D anatomy map. Every id here has at least one
 * region in components/body-paths.ts (guarded by e2e/unit/exercise-catalog).
 */
export const MUSCLES = {
  chest: { tr: 'Göğüs', en: 'Chest', group: 'chest' },
  front_delts: { tr: 'Ön omuz', en: 'Front delts', group: 'shoulders' },
  side_delts: { tr: 'Yan omuz', en: 'Side delts', group: 'shoulders' },
  rear_delts: { tr: 'Arka omuz', en: 'Rear delts', group: 'shoulders' },
  traps: { tr: 'Trapez', en: 'Traps', group: 'back' },
  upper_back: { tr: 'Üst sırt', en: 'Upper back', group: 'back' },
  lats: { tr: 'Kanat (latissimus)', en: 'Lats', group: 'back' },
  lower_back: { tr: 'Bel', en: 'Lower back', group: 'back' },
  biceps: { tr: 'Biceps', en: 'Biceps', group: 'arms' },
  triceps: { tr: 'Triceps', en: 'Triceps', group: 'arms' },
  forearms: { tr: 'Ön kol', en: 'Forearms', group: 'arms' },
  abs: { tr: 'Karın', en: 'Abs', group: 'core' },
  obliques: { tr: 'Yan karın', en: 'Obliques', group: 'core' },
  hip_flexors: { tr: 'Kalça fleksörleri', en: 'Hip flexors', group: 'core' },
  glutes: { tr: 'Kalça', en: 'Glutes', group: 'legs' },
  quads: { tr: 'Ön bacak', en: 'Quads', group: 'legs' },
  adductors: { tr: 'İç bacak', en: 'Adductors', group: 'legs' },
  hamstrings: { tr: 'Arka bacak', en: 'Hamstrings', group: 'legs' },
  calves: { tr: 'Baldır', en: 'Calves', group: 'legs' },
} as const satisfies Record<string, { tr: string; en: string; group: string }>;

export type MuscleId = keyof typeof MUSCLES;

export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Göğüs' },
  { id: 'shoulders', label: 'Omuz' },
  { id: 'back', label: 'Sırt' },
  { id: 'arms', label: 'Kol' },
  { id: 'core', label: 'Core' },
  { id: 'legs', label: 'Bacak & kalça' },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id'];

export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];

export const isMuscleId = (v: unknown): v is MuscleId => typeof v === 'string' && v in MUSCLES;

export const musclesOfGroup = (group: MuscleGroupId): MuscleId[] =>
  MUSCLE_IDS.filter((m) => MUSCLES[m].group === group);
