import * as Linking from 'expo-linking';

import { backendMode, storageKeys, type BackendMode } from '@/lib/backend';
import { storage } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';

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

export const authFail = (error: string, code: AuthFailureCode = 'other'): AuthResult => ({ ok: false, error, code });
const fail = authFail;

/** Where confirmation emails send the user back: /auth/callback of this app. */
export const emailRedirectUrl = () => Linking.createURL('/auth/callback');

/* ------------------------------------------------------------------ */
/* Supabase implementation (loaded on first use)                       */
/* ------------------------------------------------------------------ */

/**
 * Same AuthService contract; the implementation (./supabase-auth-service)
 * and the Supabase SDK load on the first call, so neither is part of the
 * first web download. If that load fails (chunk not reachable), user actions
 * get the usual network message and the next call tries again.
 */
function createLazySupabaseAuthService(): AuthService {
  let impl: Promise<AuthService> | null = null;
  const load = () => {
    if (!impl) {
      const loading = Promise.all([import('./supabase-auth-service'), getSupabase()]).then(([m, client]) => m.createSupabaseAuthService(client));
      loading.catch(() => {
        if (impl === loading) impl = null;
      });
      impl = loading;
    }
    return impl;
  };
  const offline = () => fail('Bağlantı hatası. İnternetini kontrol edip tekrar dene.', 'network');
  const action = async (run: (s: AuthService) => Promise<AuthResult>): Promise<AuthResult> => {
    let service: AuthService;
    try {
      service = await load();
    } catch (error) {
      console.warn('[auth] could not load the sign-in service', error);
      return offline();
    }
    return run(service);
  };

  return {
    mode: 'supabase',
    getCurrentUser: async () => (await load()).getCurrentUser(),
    signIn: (email, password) => action((s) => s.signIn(email, password)),
    signUp: (displayName, email, password) => action((s) => s.signUp(displayName, email, password)),
    signOut: async () => (await load()).signOut(),
    resendConfirmation: (email) => action((s) => s.resendConfirmation(email)),
    completeEmailLink: (url) => action((s) => s.completeEmailLink(url)),
    subscribe(listener) {
      let unsubscribe: (() => void) | null = null;
      let active = true;
      load()
        .then((s) => {
          if (active) unsubscribe = s.subscribe(listener);
        })
        .catch((error) => console.warn('[auth] could not subscribe to session changes', error));
      return () => {
        active = false;
        unsubscribe?.();
      };
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

export const authService: AuthService = backendMode === 'supabase' ? createLazySupabaseAuthService() : createDemoAuthService();
