import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { backendMode } from './backend';
import { env } from './env';

/**
 * Supabase client, or `null` in demo mode. Callers must handle the null case.
 *
 * Only the publishable key is ever used here; data access is enforced by RLS.
 * `detectSessionInUrl` is off on every platform: email links are handled
 * explicitly by the /auth/callback screen, so web and native behave the same.
 */
export const supabase: SupabaseClient | null =
  backendMode === 'supabase'
    ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Only refresh tokens while the app is in the foreground on native.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
