import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { LIMITS, isGoalId, isSportId } from './catalog';
import type { AthleteProfile } from './types';

const localKey = (userId: string) => `athlete:${userId}`;

/** Row shape of public.athlete_profiles (see supabase/migrations). */
type AthleteProfileRow = {
  user_id: string;
  primary_sport: string;
  secondary_sports: string[];
  goals: string[];
  age: number;
  height_cm: number;
  weight_kg: number;
  created_at: string;
  updated_at: string;
};

const inRange = (n: unknown, r: { min: number; max: number }) => typeof n === 'number' && n >= r.min && n <= r.max;

/** Defensive parsing — never trust stored or remote data blindly. */
function sanitize(p: Partial<AthleteProfile> | null | undefined, userId: string): AthleteProfile | null {
  if (!p || !isSportId(p.primarySport)) return null;
  if (!inRange(p.age, LIMITS.age) || !inRange(p.heightCm, LIMITS.heightCm) || !inRange(p.weightKg, LIMITS.weightKg)) {
    return null;
  }
  const now = new Date().toISOString();
  return {
    userId,
    primarySport: p.primarySport,
    secondarySports: (p.secondarySports ?? []).filter(isSportId).filter((s) => s !== p.primarySport).slice(0, LIMITS.secondarySportsMax),
    goals: (p.goals ?? []).filter(isGoalId).slice(0, LIMITS.goalsMax),
    age: p.age!,
    heightCm: p.heightCm!,
    weightKg: p.weightKg!,
    createdAt: p.createdAt ?? now,
    updatedAt: p.updatedAt ?? now,
  };
}

const fromRow = (r: AthleteProfileRow): Partial<AthleteProfile> => ({
  primarySport: r.primary_sport as AthleteProfile['primarySport'],
  secondarySports: r.secondary_sports as AthleteProfile['secondarySports'],
  goals: r.goals as AthleteProfile['goals'],
  age: r.age,
  heightCm: r.height_cm,
  weightKg: Number(r.weight_kg),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (p: AthleteProfile): AthleteProfileRow => ({
  user_id: p.userId,
  primary_sport: p.primarySport,
  secondary_sports: p.secondarySports,
  goals: p.goals,
  age: p.age,
  height_cm: p.heightCm,
  weight_kg: p.weightKg,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
});

/**
 * Local-first profile store. The device copy is always written; when
 * Supabase is configured the profile is also synced to `athlete_profiles`.
 */
export const profileRepository = {
  async load(userId: string): Promise<AthleteProfile | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<AthleteProfileRow>();
      if (!error && data) {
        const remote = sanitize(fromRow(data), userId);
        if (remote) {
          await storage.set(localKey(userId), remote);
          return remote;
        }
      }
      if (error) console.warn('[profile] remote load failed, using device copy', error.message);
    }
    return sanitize(await storage.get<AthleteProfile>(localKey(userId)), userId);
  },

  async save(profile: AthleteProfile): Promise<AthleteProfile> {
    const clean = sanitize(profile, profile.userId);
    if (!clean) throw new Error('Geçersiz profil verisi.');
    await storage.set(localKey(clean.userId), clean);
    if (supabase) {
      const { error } = await supabase.from('athlete_profiles').upsert(toRow(clean), { onConflict: 'user_id' });
      if (error) console.warn('[profile] remote sync failed; saved on device only', error.message);
    }
    return clean;
  },
};
