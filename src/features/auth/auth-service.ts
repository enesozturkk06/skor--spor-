import { isAuthRetryableFetchError, type AuthError, type User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { backendMode, storageKeys, type BackendMode } from '@/lib/backend';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

/** Failure kinds the UI reacts to (beyond showing the message). */
export type AuthFailureCode = 'email_not_confirmed' | 'link_expired' | 'invalid_link' | 'rate_limited' | 'network' | 'other';

export type AuthResult =
  | { ok: true; user: AuthUser | null; needsEmailConfirmation?: boolean }
  | { ok: false; error: string; code: AuthFailureCode };

/** Why the session ended: the user pressed "sign out", or it expired / was revoked. */
export type SignOutReason = 'user' | 'expired';

export type AuthListener = (user: AuthUser | null, reason?: SignOutReason) => void;

export interface AuthService {
  readonly mode: BackendMode;
  /** Restores the stored session; in Supabase mode it is verified with the server. */
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(displayName: string, email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Sends the sign-up confirmation email again. */
  resendConfirmation(email: string): Promise<AuthResult>;
  /** Completes sign-in from an email confirmation link (/auth/callback). */
  completeEmailLink(url: string): Promise<AuthResult>;
  subscribe(listener: AuthListener): () => void;
}

const fail = (error: string, code: AuthFailureCode = 'other'): AuthResult => ({ ok: false, error, code });

/* ------------------------------------------------------------------ */
/* Supabase implementation                                             */
/* ------------------------------------------------------------------ */

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

/** Where confirmation emails send the user back: /auth/callback of this app. */
export const emailRedirectUrl = () => Linking.createURL('/auth/callback');

function createSupabaseAuthService(): AuthService {
  const client = supabase!;
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

/* ------------------------------------------------------------------ */
/* Demo implementation (no backend keys)                               */
/* Stores ONLY id/email/name on device — passwords are never stored.   */
/* ------------------------------------------------------------------ */

function makeId(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `demo-${Date.now().toString(36)}-${rand()}${rand()}`;
}

function createDemoAuthService(): AuthService {
  const listeners = new Set<AuthListener>();
  const emit = (user: AuthUser | null, reason?: SignOutReason) => listeners.forEach((l) => l(user, reason));

  const accounts = async () => (await storage.get<Record<string, AuthUser>>(storageKeys.demoAccounts)) ?? {};

  const startSession = async (user: AuthUser): Promise<AuthResult> => {
    await storage.set(storageKeys.demoSession, user);
    emit(user);
    return { ok: true, user };
  };

  return {
    mode: 'demo',
    getCurrentUser: () => storage.get<AuthUser>(storageKeys.demoSession),
    async signIn(email) {
      const key = email.trim().toLowerCase();
      const existing = (await accounts())[key];
      if (!existing) return fail('Bu cihazda bu e-posta ile kayıtlı demo hesabı yok. Önce kayıt olun.');
      return startSession(existing);
    },
    async signUp(displayName, email) {
      const key = email.trim().toLowerCase();
      const all = await accounts();
      if (all[key]) return fail('Bu e-posta ile zaten bir hesap var.');
      const user: AuthUser = { id: makeId(), email: key, displayName: displayName.trim() };
      await storage.set(storageKeys.demoAccounts, { ...all, [key]: user });
      return startSession(user);
    },
    async signOut() {
      await storage.remove(storageKeys.demoSession);
      emit(null, 'user');
    },
    async resendConfirmation() {
      return { ok: true, user: null };
    },
    async completeEmailLink() {
      return fail('Demo modunda e-posta doğrulaması kullanılmaz.', 'invalid_link');
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const authService: AuthService = backendMode === 'supabase' ? createSupabaseAuthService() : createDemoAuthService();
