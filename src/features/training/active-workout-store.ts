import { storageKeys } from '@/lib/backend';
import { storage } from '@/lib/storage';

import type { ActiveWorkout } from './types';
import { sanitizeActive } from './workout-model';

/**
 * The workout in progress, saved on the device after every change so a
 * reload, crash or app kill resumes exactly where the athlete stopped.
 * Writes are serialized per user: the last change always wins on disk.
 */
const queues = new Map<string, Promise<void>>();

export const activeWorkoutStore = {
  async load(userId: string): Promise<ActiveWorkout | null> {
    await queues.get(userId); // never read a half-finished write
    return sanitizeActive(await storage.get<unknown>(storageKeys.activeWorkout(userId)), userId);
  },

  save(userId: string, workout: ActiveWorkout | null): Promise<void> {
    const key = storageKeys.activeWorkout(userId);
    const prev = queues.get(userId) ?? Promise.resolve();
    const next = prev.then(() => (workout ? storage.set(key, workout) : storage.remove(key)));
    queues.set(userId, next);
    return next;
  },
};
