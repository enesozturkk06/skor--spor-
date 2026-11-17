import type { PostgrestError } from '@supabase/supabase-js';

/**
 * How a failed Supabase call should be handled (same rules as the profile
 * repository): offline → retry later; auth → stop and never show the device
 * copy; permanent → the data itself was refused, retrying can't help.
 */
export type Failure = 'network' | 'auth' | 'permanent' | 'transient';

export const isPostgrestError = (e: unknown): e is PostgrestError =>
  typeof e === 'object' && e !== null && 'message' in e && 'code' in e;
const isNetwork = (e: PostgrestError) => !e.code && /fetch|network|load failed/i.test(e.message ?? '');
const isAuth = (e: PostgrestError) => ['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(e.code);
const isPermanent = (e: PostgrestError) => ['22023', '23514', '23502', '22P02', '23503', '23505', 'P0001'].includes(e.code);

export function classify(e: unknown): Failure {
  if (!isPostgrestError(e)) return 'network'; // thrown fetch error
  if (isNetwork(e)) return 'network';
  if (isAuth(e)) return 'auth';
  if (isPermanent(e)) return 'permanent';
  return 'transient'; // 5xx and unknown: retry later
}

export const SESSION_REJECTED = 'Oturumun sona ermiş olabilir. Lütfen tekrar giriş yap.';
