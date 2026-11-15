import { backendMode, storageKeys } from '@/lib/backend';
import { storage } from '@/lib/storage';

import { LIMITS, isGoalId, isSportId, type GoalId, type SportId } from './catalog';

/**
 * Onboarding progress kept on the device, so closing the app or reloading
 * mid-way never loses the athlete's answers. Not synced anywhere: it becomes
 * a real profile only when the athlete confirms the final step.
 */
export type OnboardingDraft = {
  step: number;
  primary: SportId | null;
  secondary: SportId[];
  goals: GoalId[];
  age: string;
  height: string;
  weight: string;
};

/** Last step a draft may resume at (the summary). */
export const DRAFT_MAX_STEP = 5;

const digits = (v: unknown, max: number) => (typeof v === 'string' && /^[0-9]{0,3}([.,][0-9]?)?$/.test(v) && v.length <= max ? v : '');

/** Defensive parsing: a corrupted or outdated draft must never break onboarding. */
function sanitize(raw: unknown): OnboardingDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<Record<keyof OnboardingDraft, unknown>>;
  const primary = isSportId(d.primary) ? d.primary : null;
  const list = <T>(v: unknown, guard: (x: unknown) => x is T, max: number) =>
    Array.isArray(v) ? [...new Set(v.filter(guard))].slice(0, max) : [];
  const step = typeof d.step === 'number' && Number.isInteger(d.step) ? Math.min(Math.max(d.step, 1), DRAFT_MAX_STEP) : 1;
  return {
    // Never resume past a step whose answers are missing.
    step: !primary ? 1 : step,
    primary,
    secondary: list(d.secondary, isSportId, LIMITS.secondarySportsMax).filter((s) => s !== primary),
    goals: list(d.goals, isGoalId, LIMITS.goalsMax),
    age: digits(d.age, 2),
    height: digits(d.height, 3),
    weight: digits(d.weight, 5),
  };
}

export const onboardingDraft = {
  async load(userId: string): Promise<OnboardingDraft | null> {
    return sanitize(await storage.get<unknown>(storageKeys.onboardingDraft(userId)));
  },
  async save(userId: string, draft: OnboardingDraft): Promise<void> {
    await storage.set(storageKeys.onboardingDraft(userId), draft);
  },
  async clear(userId: string): Promise<void> {
    await storage.remove(storageKeys.onboardingDraft(userId));
  },
  /** On sign-out / expiry: Supabase builds remove it (shared devices); demo keeps it. */
  async clearOnSignOut(userId: string): Promise<void> {
    if (backendMode === 'supabase') await storage.remove(storageKeys.onboardingDraft(userId));
  },
};
