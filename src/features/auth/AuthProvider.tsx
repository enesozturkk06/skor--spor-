import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService, type AuthService, type AuthUser } from './auth-service';

type AuthContextValue = {
  user: AuthUser | null;
  /** True until the persisted session has been read (and verified in Supabase mode). */
  initializing: boolean;
  mode: AuthService['mode'];
  /** Set when the session ended without the user signing out (expired / revoked). */
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  signIn: AuthService['signIn'];
  signUp: AuthService['signUp'];
  signOut: AuthService['signOut'];
  resendConfirmation: AuthService['resendConfirmation'];
  completeEmailLink: AuthService['completeEmailLink'];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let active = true;
    // Subscribe first so a session that turns out to be invalid during the
    // initial check is reported as "expired".
    const unsubscribe = authService.subscribe((u, reason) => {
      if (!active) return;
      setUser(u);
      if (u) setSessionExpired(false);
      else if (reason === 'expired') setSessionExpired(true);
    });
    authService
      .getCurrentUser()
      .then((u) => active && setUser(u))
      .catch((error) => console.warn('[auth] session restore failed', error))
      .finally(() => active && setInitializing(false));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      mode: authService.mode,
      sessionExpired,
      dismissSessionExpired,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
      resendConfirmation: authService.resendConfirmation,
      completeEmailLink: authService.completeEmailLink,
    }),
    [user, initializing, sessionExpired, dismissSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
