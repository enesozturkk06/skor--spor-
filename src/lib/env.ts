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
} as const;
