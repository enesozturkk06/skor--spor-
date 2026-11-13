import type { IconName } from '@/components/ui';

export type SportCategory = 'strength' | 'combat' | 'team' | 'endurance' | 'racket';

export const SPORTS = [
  { id: 'fitness', label: 'Fitness', icon: 'dumbbell', category: 'strength' },
  { id: 'bodybuilding', label: 'Bodybuilding', icon: 'weight-lifter', category: 'strength' },
  { id: 'boxing', label: 'Boks', icon: 'boxing-glove', category: 'combat' },
  { id: 'kickboxing', label: 'Kickboks', icon: 'mixed-martial-arts', category: 'combat' },
  { id: 'karate', label: 'Karate', icon: 'karate', category: 'combat' },
  { id: 'football', label: 'Futbol', icon: 'soccer', category: 'team' },
  { id: 'basketball', label: 'Basketbol', icon: 'basketball', category: 'team' },
  { id: 'volleyball', label: 'Voleybol', icon: 'volleyball', category: 'team' },
  { id: 'running', label: 'Koşu', icon: 'run', category: 'endurance' },
  { id: 'swimming', label: 'Yüzme', icon: 'swim', category: 'endurance' },
  { id: 'tennis', label: 'Tenis', icon: 'tennis', category: 'racket' },
] as const satisfies readonly { id: string; label: string; icon: IconName; category: SportCategory }[];

export type SportId = (typeof SPORTS)[number]['id'];

export const GOALS = [
  { id: 'muscle_gain', label: 'Kas kazanımı', icon: 'arm-flex' },
  { id: 'fat_loss', label: 'Yağ yakımı', icon: 'fire' },
  { id: 'strength', label: 'Güç artışı', icon: 'weight-lifter' },
  { id: 'endurance', label: 'Dayanıklılık', icon: 'heart-pulse' },
  { id: 'performance', label: 'Branş performansı', icon: 'lightning-bolt' },
  { id: 'competition', label: 'Müsabaka hazırlığı', icon: 'trophy-outline' },
  { id: 'mobility', label: 'Mobilite & esneklik', icon: 'yoga' },
  { id: 'wellness', label: 'Sağlıklı yaşam', icon: 'meditation' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type GoalId = (typeof GOALS)[number]['id'];

const sportMap = new Map<string, (typeof SPORTS)[number]>(SPORTS.map((s) => [s.id, s]));
const goalMap = new Map<string, (typeof GOALS)[number]>(GOALS.map((g) => [g.id, g]));

export const getSport = (id: SportId) => sportMap.get(id)!;
export const getGoal = (id: GoalId) => goalMap.get(id)!;
export const isSportId = (v: unknown): v is SportId => typeof v === 'string' && sportMap.has(v);
export const isGoalId = (v: unknown): v is GoalId => typeof v === 'string' && goalMap.has(v);

export const LIMITS = {
  secondarySportsMax: 4,
  goalsMax: 3,
  age: { min: 13, max: 90 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
} as const;
