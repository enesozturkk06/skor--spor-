import type { PostgrestError } from '@supabase/supabase-js';

import { backendMode, storageKeys } from '@/lib/backend';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { LIMITS, isGoalId, isSportId } from './catalog';
import type { AthleteProfile } from './types';

/** Row shape of public.athlete_profiles (see supabase/migrations). */
type AthleteProfileRow = {
  user_id: string;
  primary_sport: string;
  secondary_sports: string[];
  goals: string[];
  age: number;
  height_cm: number;
  weight_kg: number | string;
  created_at: string;
  updated_at: string;
};

/** What the client writes. Timestamps are server-managed (trigger) and never sent. */
type AthleteProfileWrite = Omit<AthleteProfileRow, 'created_at' | 'updated_at' | 'weight_kg'> & { weight_kg: number };

export type ProfileLoadResult =
  /** Fresh from the backend (or the device in demo mode). */
  | { status: 'ok'; profile: AthleteProfile | null }
  /** Backend unreachable; showing the last copy saved on this device. */
  | { status: 'stale'; profile: AthleteProfile }
  /** Backend unreachable and nothing cached: the UI offers a retry. */
  | { status: 'error'; message: string };

export class ProfileSaveError extends Error {}

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
  // numeric columns may arrive as strings
  weightKg: Number(r.weight_kg),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toWrite = (p: AthleteProfile): AthleteProfileWrite => ({
  user_id: p.userId,
  primary_sport: p.primarySport,
  secondary_sports: p.secondarySports,
  goals: p.goals,
  age: p.age,
  height_cm: p.heightCm,
  weight_kg: p.weightKg,
});

/** postgrest-js reports a failed fetch as an error object without a code (it does not throw). */
const isNetworkError = (error: PostgrestError) => !error.code && /fetch|network|load failed/i.test(error.message ?? '');

/** The backend rejected the request's credentials (expired / revoked session, RLS). */
const isAuthRejection = (error: PostgrestError) => ['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(error.code);

const isPostgrestError = (e: unknown): e is PostgrestError =>
  typeof e === 'object' && e !== null && 'code' in e && 'message' in e;

const SESSION_REJECTED ='Oturumun sona ermiş olabilir. Lütfen tekrar giriş yap.';

/** User-facing message for a failed save; details go to the console. */
function saveErrorMessage(error: PostgrestError | null, cause?: unknown): string {
  if (!error || isNetworkError(error)) return 'Bağlantı hatası. Profil kaydedilemedi; internetini kontrol edip tekrar dene.';
  if (isAuthRejection(error)) return SESSION_REJECTED;
  if (error.code === '23514' || error.code === '23502' || error.code === '22P02') {
    return 'Profil bilgilerinden biri geçersiz. Lütfen kontrol edip tekrar dene.';
  }
  console.warn('[profile] save failed', error.code, error.message, cause ?? '');
  return 'Profil kaydedilemedi. Lütfen tekrar dene.';
}

const LEGACY_CACHE_KEY = (userId: string) => `athlete:${userId}`;

const PROFILE_COLUMNS ='user_id, primary_sport, secondary_sports, goals, age, height_cm, weight_kg, created_at, updated_at';

export const profileRepository = {
  async load(userId: string): Promise<ProfileLoadResult> {
    const cacheKey = storageKeys.profileCache(userId);
    let cached = sanitize(await storage.get<AthleteProfile>(cacheKey), userId);

    // One-time move from the pre-namespacing key (`athlete:<id>`). Demo keeps
    // that data; Supabase mode drops it because the server is authoritative.
    const legacy = await storage.get<AthleteProfile>(LEGACY_CACHE_KEY(userId));
    if (legacy) {
      if (backendMode === 'demo' && !cached) {
        cached = sanitize(legacy, userId);
        if (cached) await storage.set(cacheKey, cached);
      }
      await storage.remove(LEGACY_CACHE_KEY(userId));
    }

    if (backendMode === 'demo' || !supabase) return { status: 'ok', profile: cached };

    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select(PROFILE_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle<AthleteProfileRow>();
      if (error) throw error;
      // The server is authoritative: no row means "not onboarded yet".
      const profile = data ? sanitize(fromRow(data), userId) : null;
      if (profile) await storage.set(cacheKey, profile);
      else await storage.remove(cacheKey);
      return { status: 'ok', profile };
    } catch (error) {
      console.warn('[profile] remote load failed', error);
      // A rejected session is not "offline": never fall back to the device copy.
      if (isPostgrestError(error) && isAuthRejection(error)) {
        await storage.remove(cacheKey);
        return { status: 'error', message: SESSION_REJECTED };
      }
      if (cached) return { status: 'stale', profile: cached };
      return { status: 'error', message: 'Profil yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.' };
    }
  },

  /** Saves and returns the stored profile. Throws ProfileSaveError with a user-facing message. */
  async save(profile: AthleteProfile): Promise<AthleteProfile> {
    const clean = sanitize(profile, profile.userId);
    if (!clean) throw new ProfileSaveError('Geçersiz profil verisi.');
    const cacheKey = storageKeys.profileCache(clean.userId);

    if (backendMode === 'demo' || !supabase) {
      await storage.set(cacheKey, clean);
      return clean;
    }

    let data: AthleteProfileRow | null = null;
    let error: PostgrestError | null = null;
    try {
      ({ data, error } = await supabase
        .from('athlete_profiles')
        .upsert(toWrite(clean), { onConflict: 'user_id' })
        .select(PROFILE_COLUMNS)
        .single<AthleteProfileRow>());
    } catch (cause) {
      throw new ProfileSaveError(saveErrorMessage(null, cause));
    }
    if (error || !data) throw new ProfileSaveError(saveErrorMessage(error));

    // Keep what the server stored (server timestamps), not what we sent.
    const saved = sanitize(fromRow(data), clean.userId) ?? clean;
    await storage.set(cacheKey, saved);
    return saved;
  },

  /**
   * Removes the device copy on sign-out so nothing lingers on shared devices.
   * Supabase mode only: in demo mode the device copy IS the profile.
   */
  async clearCache(userId: string): Promise<void> {
    if (backendMode !== 'supabase') return;
    await storage.remove(storageKeys.profileCache(userId));
  },
};
