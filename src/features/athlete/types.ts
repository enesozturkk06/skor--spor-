import type { GoalId, SportId } from './catalog';

export type AthleteProfile = {
  userId: string;
  primarySport: SportId;
  secondarySports: SportId[];
  goals: GoalId[];
  age: number;
  heightCm: number;
  weightKg: number;
  createdAt: string;
  updatedAt: string;
};

export type AthleteProfileInput = Omit<AthleteProfile, 'userId' | 'createdAt' | 'updatedAt'>;
