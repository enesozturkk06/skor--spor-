import type { SupabaseClient } from '@supabase/supabase-js';

import { backendMode } from './backend';

/** True when this build talks to Supabase (decided at build time, see ./backend). */
export const hasSupabase = backendMode === 'supabase';

let client: Promise<SupabaseClient> | null = null;

/**
 * The Supabase client, loaded on first use (a separate web chunk). Demo builds
 * never call this, so they never download the SDK. A failed load (e.g. the
 * chunk could not be fetched while offline) is not cached: the next call
 * tries again. Callers treat the rejection like any other network error.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!hasSupabase) return Promise.reject(new Error('Supabase is not configured (demo mode).'));
  if (!client) {
    const loading = import('./supabase-client').then((m) => m.createSupabaseClient());
    loading.catch(() => {
      if (client === loading) client = null;
    });
    client = loading;
  }
  return client;
}
