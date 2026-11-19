import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js';

import { authFail as fail, emailRedirectUrl, type AuthResult, type AuthService, type AuthUser } from './auth-service';

/**
 * Supabase implementation of AuthService. Loaded on demand by auth-service.ts
 * (never in demo builds), so the Supabase SDK is not part of the first download.
 *
 * Only TYPES may be imported from '@supabase/supabase-js' here: the SDK must
 * have a single lazy importer (src/lib/supabase-client.ts). A second runtime
 * importer makes the web bundler hoist the whole SDK into the shared chunk
 * that every page loads up front (checked by e2e/unit/pages-build.spec.ts).
 */

/** Same test as auth-js `isAuthRetryableFetchError` (@supabase/auth-js src/lib/errors.ts). */
function isAuthRetryableFetchError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && '__isAuthError' in error && (error as { name?: unknown }).name === 'AuthRetryableFetchError';
}

function mapSupabaseUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as { display_name?: unknown };
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    displayName: typeof meta.display_name === 'string' && meta.display_name ? meta.display_name : email.split('@')[0],
  };
}

/** Maps Supabase Auth errors (by error code, then status) to Turkish messages. */
function translateAuthError(error: AuthError): AuthResult {
  if (isAuthRetryableFetchError(error)) return fail('Bağlantı hatası. İnternetini kontrol edip tekrar dene.', 'network');
  switch (error.code) {
    case 'invalid_credentials':
      return fail('E-posta veya şifre hatalı.');
    case 'email_not_confirmed':
      return fail('E-posta adresini henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.', 'email_not_confirmed');
    case 'user_already_exists':
      return fail('Bu e-posta ile zaten bir hesap var.');
    case 'weak_password':
      return fail('Şifre yeterince güçlü değil. Daha uzun bir şifre dene.');
    case 'email_address_invalid':
      return fail('Geçerli bir e-posta girin.');
    case 'signup_disabled':
      return fail('Şu anda yeni kayıt alınmıyor.');
    case 'over_email_send_rate_limit':
      return fail('Çok fazla e-posta istendi. Birkaç dakika sonra tekrar dene.', 'rate_limited');
    case 'over_request_rate_limit':
      return fail('Çok fazla deneme yapıldı. Lütfen biraz bekle.', 'rate_limited');
    case 'otp_expired':
      return fail('Doğrulama bağlantısının süresi dolmuş. Yeni bir bağlantı iste.', 'link_expired');
  }
  if (error.status === 429) return fail('Çok fazla deneme yapıldı. Lütfen biraz bekle.', 'rate_limited');
  return fail('Bir sorun oluştu. Lütfen tekrar dene.');
}

/**
 * The server answered and rejected this session (expired, revoked, user removed).
 * Only a failed request (offline, 5xx) is "unknown" — any auth answer is final.
 * Note: auth-js may report a revoked session as AuthSessionMissingError (status 400),
 * so checking only 401/403 would wrongly keep a revoked session alive.
 */
function isInvalidSession(error: AuthError): boolean {
  return !isAuthRetryableFetchError(error);
}

/** Reads `key=value` pairs from both the query string and the #fragment. */
function linkParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  for (const part of [query, hash]) {
    for (const [k, v] of new URLSearchParams(part)) out[k] = v;
  }
  return out;
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  // Distinguishes a deliberate sign-out from an expired/revoked session.
  let userInitiatedSignOut = false;

  return {
    mode: 'supabase',

    async getCurrentUser() {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;
      const verified = await client.auth.getUser();
      if (verified.error) {
        if (isInvalidSession(verified.error)) {
          // Clears the stored session; listeners receive SIGNED_OUT → "expired".
          await client.auth.signOut({ scope: 'local' });
          return null;
        }
        // Offline: keep the stored session instead of signing the athlete out.
        return mapSupabaseUser(data.session.user);
      }
      return mapSupabaseUser(verified.data.user);
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return translateAuthError(error);
      return { ok: true, user: data.user ? mapSupabaseUser(data.user) : null };
    },

    async signUp(displayName, email, password) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() }, emailRedirectTo: emailRedirectUrl() },
      });
      if (error) return translateAuthError(error);
      // No session = confirmation required. (For an already-registered email Supabase
      // also answers this way without sending mail, so accounts can't be enumerated.)
      if (!data.session) return { ok: true, user: null, needsEmailConfirmation: true };
      return { ok: true, user: data.user ? mapSupabaseUser(data.user) : null };
    },

    async signOut() {
      userInitiatedSignOut = true;
      try {
        const { error } = await client.auth.signOut();
        // Offline or already revoked: still end the session on this device.
        if (error) await client.auth.signOut({ scope: 'local' });
      } finally {
        userInitiatedSignOut = false;
      }
    },

    async resendConfirmation(email) {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: emailRedirectUrl() },
      });
      return error ? translateAuthError(error) : { ok: true, user: null };
    },

    async completeEmailLink(url) {
      const p = linkParams(url);
      if (p.error || p.error_description) {
        return p.error_code === 'otp_expired'
          ? fail('Doğrulama bağlantısının süresi dolmuş. Yeni bir bağlantı iste.', 'link_expired')
          : fail('Doğrulama bağlantısı geçersiz. Yeni bir bağlantı iste.', 'invalid_link');
      }
      if (p.access_token && p.refresh_token) {
        // setSession verifies the token with the server before storing it.
        const { data, error } = await client.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
        if (error) return translateAuthError(error);
        return { ok: true, user: data.user ? mapSupabaseUser(data.user) : null };
      }
      if (p.code) {
        const { data, error } = await client.auth.exchangeCodeForSession(p.code);
        if (error) return translateAuthError(error);
        return { ok: true, user: data.user ? mapSupabaseUser(data.user) : null };
      }
      return fail('Doğrulama bağlantısı geçersiz. Yeni bir bağlantı iste.', 'invalid_link');
    },

    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') listener(null, userInitiatedSignOut ? 'user' : 'expired');
        else listener(session?.user ? mapSupabaseUser(session.user) : null);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
