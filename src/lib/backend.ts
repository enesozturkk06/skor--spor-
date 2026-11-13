import { env } from './env';

/**
 * Single source of truth for which backend this build talks to.
 * Decided at build time from EXPO_PUBLIC_* values and never changes at runtime,
 * so demo and Supabase data can never mix within one build.
 */
export type BackendMode = 'supabase' | 'demo';

export const backendMode: BackendMode = env.isSupabaseConfigured ? 'supabase' : 'demo';

/**
 * Storage keys are namespaced by mode: a device that once ran a demo build
 * never shows demo data in a Supabase build (and vice versa).
 */
export const storageKeys = {
  profileCache: (userId: string) => `profile:${backendMode}:${userId}`,
  demoSession: 'demo:session',
  demoAccounts: 'demo:accounts',
} as const;
