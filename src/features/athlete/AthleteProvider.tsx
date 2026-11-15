import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { profileRepository, type ProfileLoadResult } from './profile-repository';
import type { AthleteProfile, AthleteProfileInput } from './types';

type AthleteContextValue = {
  profile: AthleteProfile | null;
  /** True while the profile for the current user is being loaded. */
  loading: boolean;
  /** Loading failed and there is nothing to show (offer retry). */
  loadError: string | null;
  /** Showing the device copy because the backend was unreachable. */
  stale: boolean;
  /** Full reload: clears the screen (skeleton) — used after a load error. */
  reload: () => void;
  /**
   * Background refresh (pull-to-refresh): keeps showing the current profile
   * and swaps in the fresh one. A failed refresh never wipes what is shown.
   */
  refresh: () => Promise<void>;
  refreshing: boolean;
  saveProfile: (input: AthleteProfileInput) => Promise<AthleteProfile>;
};

/** Results are tagged with the user they belong to, so nothing leaks across accounts. */
type Loaded = { userId: string; result: ProfileLoadResult };

const AthleteContext = createContext<AthleteContextValue | null>(null);

export function AthleteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previousUserId = useRef<string | null>(null);

  // Signing out (or an expired session) removes the previous athlete's device copy.
  useEffect(() => {
    const prev = previousUserId.current;
    if (prev && prev !== userId) void profileRepository.clearCache(prev);
    previousUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    profileRepository
      .load(userId)
      .catch((error): ProfileLoadResult => {
        console.warn('[profile] load failed', error);
        return { status: 'error', message: 'Profil yüklenemedi. Lütfen tekrar dene.' };
      })
      .then((result) => {
        if (active) setLoaded({ userId, result });
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const current = loaded && loaded.userId === userId ? loaded.result : null;
  const profile = current && current.status !== 'error' ? current.profile : null;

  const reload = useCallback(() => {
    setLoaded(null);
    setAttempt((n) => n + 1);
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!userId || refreshing) return;
    setRefreshing(true);
    try {
      const result = await profileRepository.load(userId).catch(
        (): ProfileLoadResult => ({ status: 'error', message: 'Profil yenilenemedi.' }),
      );
      setLoaded((prev) => {
        const shown = prev && prev.userId === userId && prev.result.status !== 'error' ? prev.result.profile : null;
        // Network trouble: keep what is on screen, marked as possibly outdated.
        // A rejected session is never treated as "offline" (same rule as load()).
        if (result.status === 'error' && result.reason !== 'auth' && shown) {
          return { userId, result: { status: 'stale', profile: shown } };
        }
        return { userId, result };
      });
    } finally {
      setRefreshing(false);
    }
  }, [userId, refreshing]);

  const saveProfile = useCallback(
    async (input: AthleteProfileInput) => {
      if (!userId) throw new Error('Oturum bulunamadı.');
      const now = new Date().toISOString();
      const saved = await profileRepository.save({
        ...input,
        userId,
        createdAt: profile?.createdAt ?? now,
        updatedAt: now,
      });
      setLoaded({ userId, result: { status: 'ok', profile: saved } });
      return saved;
    },
    [userId, profile?.createdAt],
  );

  const value = useMemo<AthleteContextValue>(
    () => ({
      profile,
      loading: Boolean(userId) && !current,
      loadError: current?.status === 'error' ? current.message : null,
      stale: current?.status === 'stale',
      reload,
      refresh,
      refreshing,
      saveProfile,
    }),
    [profile, userId, current, reload, refresh, refreshing, saveProfile],
  );

  return <AthleteContext.Provider value={value}>{children}</AthleteContext.Provider>;
}

export function useAthlete(): AthleteContextValue {
  const ctx = useContext(AthleteContext);
  if (!ctx) throw new Error('useAthlete must be used inside <AthleteProvider>');
  return ctx;
}
