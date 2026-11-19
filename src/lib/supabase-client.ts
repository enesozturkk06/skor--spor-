import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from './env';

/**
 * Creates the Supabase client. Never import this module directly: use
 * `getSupabase()` from ./supabase, which loads it on first use so the
 * Supabase SDK (~250 KB) stays out of the first web download and is never
 * loaded at all in demo builds.
 *
 * Only the publishable key is ever used here; data access is enforced by RLS.
 * `detectSessionInUrl` is off on every platform: email links are handled
 * explicitly by the /auth/callback screen, so web and native behave the same.
 */
export function createSupabaseClient(): SupabaseClient {
  const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Only refresh tokens while the app is in the foreground on native.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}
