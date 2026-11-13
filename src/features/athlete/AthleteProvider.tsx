import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { profileRepository } from './profile-repository';
import type { AthleteProfile, AthleteProfileInput } from './types';

type AthleteContextValue = {
  profile: AthleteProfile | null;
  /** True while the profile for the current user is being loaded. */
  loading: boolean;
  saveProfile: (input: AthleteProfileInput) => Promise<AthleteProfile>;
};

/** Profile state is tagged with the user it belongs to, so a stale profile never leaks across accounts. */
type Loaded = { userId: string; profile: AthleteProfile | null };

const AthleteContext = createContext<AthleteContextValue | null>(null);

export function AthleteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    profileRepository
      .load(userId)
      .catch((error) => {
        console.warn('[profile] load failed', error);
        return null;
      })
      .then((profile) => {
        if (active) setLoaded({ userId, profile });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const current = loaded && loaded.userId === userId ? loaded : null;
  const profile = current?.profile ?? null;

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
      setLoaded({ userId, profile: saved });
      return saved;
    },
    [userId, profile?.createdAt],
  );

  const value = useMemo<AthleteContextValue>(
    () => ({ profile, loading: Boolean(userId) && !current, saveProfile }),
    [profile, userId, current, saveProfile],
  );

  return <AthleteContext.Provider value={value}>{children}</AthleteContext.Provider>;
}

export function useAthlete(): AthleteContextValue {
  const ctx = useContext(AthleteContext);
  if (!ctx) throw new Error('useAthlete must be used inside <AthleteProvider>');
  return ctx;
}
