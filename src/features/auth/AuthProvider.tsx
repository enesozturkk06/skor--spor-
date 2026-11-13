import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService, type AuthService, type AuthUser } from './auth-service';

type AuthContextValue = {
  user: AuthUser | null;
  /** True until the persisted session has been read. */
  initializing: boolean;
  mode: AuthService['mode'];
  signIn: AuthService['signIn'];
  signUp: AuthService['signUp'];
  signOut: AuthService['signOut'];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    authService
      .getCurrentUser()
      .then((u) => active && setUser(u))
      .catch((error) => console.warn('[auth] session restore failed', error))
      .finally(() => active && setInitializing(false));

    const unsubscribe = authService.subscribe((u) => active && setUser(u));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      mode: authService.mode,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
    }),
    [user, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
