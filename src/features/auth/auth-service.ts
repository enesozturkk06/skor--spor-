import type { AuthError, User } from '@supabase/supabase-js';

import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthResult =
  | { ok: true; user: AuthUser | null; needsEmailConfirmation?: boolean }
  | { ok: false; error: string };

export interface AuthService {
  readonly mode: 'supabase' | 'demo';
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(displayName: string, email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Subscribe to session changes. Returns an unsubscribe function. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
}

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

function translateAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (msg.includes('email not confirmed')) return 'E-posta adresinizi doğrulamanız gerekiyor.';
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Bu e-posta ile zaten bir hesap var.';
  if (msg.includes('rate limit') || error.status === 429) return 'Çok fazla deneme yapıldı. Lütfen biraz bekleyin.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Bağlantı hatası. İnternetinizi kontrol edin.';
  return 'Bir sorun oluştu. Lütfen tekrar deneyin.';
}

function createSupabaseAuthService(): AuthService {
  const client = supabase!;
  return {
    mode: 'supabase',
    async getCurrentUser() {
      const { data } = await client.auth.getSession();
      return data.session?.user ? mapSupabaseUser(data.session.user) : null;
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: translateAuthError(error) };
      return { ok: true, user: data.user ? mapSupabaseUser(data.user) : null };
    },
    async signUp(displayName, email, password) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) return { ok: false, error: translateAuthError(error) };
      if (!data.session) return { ok: true, user: null, needsEmailConfirmation: true };
      return { ok: true, user: data.user ? mapSupabaseUser(data.user) : null };
    },
    async signOut() {
      await client.auth.signOut();
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session?.user ? mapSupabaseUser(session.user) : null);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Demo implementation (no backend keys yet)                           */
/* Stores ONLY id/email/name on device — passwords are never stored.   */
/* ------------------------------------------------------------------ */

const DEMO_SESSION_KEY = 'demo:session';
const DEMO_ACCOUNTS_KEY = 'demo:accounts';

function makeId(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `demo-${Date.now().toString(36)}-${rand()}${rand()}`;
}

function createDemoAuthService(): AuthService {
  const listeners = new Set<(user: AuthUser | null) => void>();
  const emit = (user: AuthUser | null) => listeners.forEach((l) => l(user));

  const accounts = async () => (await storage.get<Record<string, AuthUser>>(DEMO_ACCOUNTS_KEY)) ?? {};

  const startSession = async (user: AuthUser) => {
    await storage.set(DEMO_SESSION_KEY, user);
    emit(user);
    return { ok: true as const, user };
  };

  return {
    mode: 'demo',
    getCurrentUser: () => storage.get<AuthUser>(DEMO_SESSION_KEY),
    async signIn(email) {
      const key = email.trim().toLowerCase();
      const existing = (await accounts())[key];
      if (!existing) return { ok: false, error: 'Bu cihazda bu e-posta ile kayıtlı demo hesabı yok. Önce kayıt olun.' };
      return startSession(existing);
    },
    async signUp(displayName, email) {
      const key = email.trim().toLowerCase();
      const all = await accounts();
      if (all[key]) return { ok: false, error: 'Bu e-posta ile zaten bir hesap var.' };
      const user: AuthUser = { id: makeId(), email: key, displayName: displayName.trim() };
      await storage.set(DEMO_ACCOUNTS_KEY, { ...all, [key]: user });
      return startSession(user);
    },
    async signOut() {
      await storage.remove(DEMO_SESSION_KEY);
      emit(null);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const authService: AuthService = supabase ? createSupabaseAuthService() : createDemoAuthService();
