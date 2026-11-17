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
  onboardingDraft: (userId: string) => `onboarding-draft:${backendMode}:${userId}`,
  /** Workout in progress (resumes after reload / app kill). */
  activeWorkout: (userId: string) => `training-active:${backendMode}:${userId}`,
  /** Finished workouts not yet confirmed by the server (Supabase mode). */
  trainingOutbox: (userId: string) => `training-outbox:${backendMode}:${userId}`,
  /** Demo: the workout store itself. Supabase: last server copy (offline view). */
  trainingHistory: (userId: string) => `training-history:${backendMode}:${userId}`,
  /** Workouts deleted here that the server may still have (sent when online). */
  trainingDeletes: (userId: string) => `training-deletes:${backendMode}:${userId}`,
  /** Programs: local copy + which ones still have to reach the server. */
  trainingTemplates: (userId: string) => `training-templates:${backendMode}:${userId}`,
  demoSession: 'demo:session',
  demoAccounts: 'demo:accounts',
} as const;
