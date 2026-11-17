/**
 * Public runtime configuration. Only EXPO_PUBLIC_* values are inlined into
 * the client bundle — never put secrets (service-role keys etc.) here.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  /** True only when both Supabase values are present and the URL is https. */
  isSupabaseConfigured: supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20,
  /**
   * Server sync for training data. Off until the training migration is live
   * (Phase 3F): workouts then stay in the device outbox and are uploaded once
   * this is turned on. Only the E2E mock build enables it today.
   */
  trainingSync: process.env.EXPO_PUBLIC_TRAINING_SYNC === '1',
} as const;
