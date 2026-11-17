import { backendMode, storageKeys } from '@/lib/backend';
import { env } from '@/lib/env';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { SESSION_REJECTED, classify } from './sync-errors';
import { fromTemplateRow, sanitizeTemplate, toTemplateRow, validateTemplate, type TemplateRow } from './template-model';
import type { WorkoutTemplate } from './types';

/**
 * The athlete's programs. Device-first: edits are saved locally at once and
 * marked dirty; Supabase mode then upserts them into workout_templates (and
 * sends deletions). The same id is upserted on every retry, so retries never
 * duplicate. Remote calls only with EXPO_PUBLIC_TRAINING_SYNC=1 (the table is
 * not live yet — Phase 3F). Built-in programs are app data and never stored.
 */
const remote = backendMode === 'supabase' && env.trainingSync && supabase !== null;

type Store = {
  items: WorkoutTemplate[];
  /** Saved here, not yet confirmed by the server. */
  dirty: string[];
  /** Deleted here, still on the server. */
  deleted: string[];
  /** Ids known to exist on the server (a workout may reference only these). */
  server: string[];
};

export type TemplatesResult =
  | { status: 'ok' | 'stale'; templates: WorkoutTemplate[] }
  | { status: 'error'; reason: 'auth' | 'network'; message: string };

export type TemplateFlush = 'idle' | 'synced' | 'offline' | 'auth' | 'disabled';

export class TemplateError extends Error {}

const chains = new Map<string, Promise<unknown>>();
function withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(userId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  chains.set(
    userId,
    next.catch(() => undefined),
  );
  return next;
}

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

async function read(userId: string): Promise<Store> {
  const raw = (await storage.get<Partial<Store>>(storageKeys.trainingTemplates(userId))) ?? {};
  const items = (Array.isArray(raw.items) ? raw.items : []).map((t) => sanitizeTemplate(t, userId)).filter((t): t is WorkoutTemplate => t !== null);
  return { items, dirty: ids(raw.dirty), deleted: ids(raw.deleted), server: ids(raw.server) };
}
const write = (userId: string, s: Store) => storage.set(storageKeys.trainingTemplates(userId), s);
const newest = (a: WorkoutTemplate, b: WorkoutTemplate) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

const COLUMNS = 'id, user_id, name, sport, goal, notes, days, blocks, updated_at';

async function flushLocked(userId: string): Promise<TemplateFlush> {
  if (!remote) return 'disabled';
  const s = await read(userId);
  if (!s.dirty.length && !s.deleted.length) return 'idle';
  const client = supabase!;
  try {
    for (const id of [...s.deleted]) {
      const { error } = await client.from('workout_templates').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      s.deleted = s.deleted.filter((x) => x !== id);
      s.server = s.server.filter((x) => x !== id);
    }
    for (const id of [...s.dirty]) {
      const t = s.items.find((x) => x.id === id);
      if (t) {
        try {
          const { error } = await client.from('workout_templates').upsert(toTemplateRow(t), { onConflict: 'id' });
          if (error) throw error;
          if (!s.server.includes(id)) s.server.push(id);
        } catch (error) {
          // Refused data stays local (still usable on this device) instead of blocking the queue.
          if (classify(error) !== 'permanent') throw error;
          console.warn('[programs] server refused program', id);
        }
      }
      s.dirty = s.dirty.filter((x) => x !== id);
    }
    return 'synced';
  } catch (error) {
    return classify(error) === 'auth' ? 'auth' : 'offline';
  } finally {
    await write(userId, s);
  }
}

const inFlight = new Map<string, Promise<TemplateFlush>>();

export const templateRepository = {
  async load(userId: string): Promise<TemplatesResult> {
    if (!remote) {
      const s = await withLock(userId, () => read(userId));
      return { status: 'ok', templates: s.items.sort(newest) };
    }
    await templateRepository.flush(userId);
    return withLock(userId, async () => {
      const s = await read(userId);
      try {
        const { data, error } = await supabase!.from('workout_templates').select(COLUMNS).eq('user_id', userId).order('updated_at', { ascending: false }).returns<TemplateRow[]>();
        if (error) throw error;
        const fromServer = (data ?? []).map((r) => fromTemplateRow(r, userId)).filter((t): t is WorkoutTemplate => t !== null);
        // Server is authoritative except for local changes it has not received yet.
        const local = s.items.filter((t) => s.dirty.includes(t.id));
        const items = [...local, ...fromServer.filter((t) => !s.dirty.includes(t.id) && !s.deleted.includes(t.id))];
        await write(userId, { ...s, items, server: fromServer.map((t) => t.id) });
        return { status: 'ok', templates: items.sort(newest) };
      } catch (error) {
        if (classify(error) === 'auth') {
          // Never show the device copy under a rejected session; unsent edits are kept.
          await write(userId, { ...s, items: s.items.filter((t) => s.dirty.includes(t.id)) });
          return { status: 'error', reason: 'auth', message: SESSION_REJECTED };
        }
        return { status: 'stale', templates: s.items.sort(newest) };
      }
    });
  },

  /** Saves (create or update) and returns the stored program. Throws TemplateError (user-facing). */
  async save(t: WorkoutTemplate, userId: string): Promise<WorkoutTemplate> {
    const problem = validateTemplate(t);
    if (problem) throw new TemplateError(problem);
    const clean = sanitizeTemplate({ ...t, userId, updatedAt: new Date().toISOString() }, userId);
    if (!clean || clean.blocks.length !== t.blocks.length) throw new TemplateError('Program kaydedilemedi: geçersiz veri.');
    await withLock(userId, async () => {
      const s = await read(userId);
      const items = [clean, ...s.items.filter((x) => x.id !== clean.id)];
      // Demo has no server: nothing is ever "dirty" there.
      await write(userId, { ...s, items, dirty: remote ? [...new Set([...s.dirty, clean.id])] : [] });
    });
    void templateRepository.flush(userId);
    return clean;
  },

  async remove(userId: string, id: string): Promise<void> {
    await withLock(userId, async () => {
      const s = await read(userId);
      await write(userId, {
        ...s,
        items: s.items.filter((x) => x.id !== id),
        dirty: s.dirty.filter((x) => x !== id),
        // Only what the server has needs a delete request.
        deleted: s.server.includes(id) ? [...new Set([...s.deleted, id])] : s.deleted,
      });
    });
    void templateRepository.flush(userId);
  },

  flush(userId: string): Promise<TemplateFlush> {
    const running = inFlight.get(userId);
    if (running) return running;
    const run = withLock(userId, () => flushLocked(userId)).finally(() => inFlight.delete(userId));
    inFlight.set(userId, run);
    return run;
  },

  /** Programs a saved workout may reference (FK workouts.template_id → workout_templates). */
  async serverIds(userId: string): Promise<Set<string>> {
    const s = await withLock(userId, () => read(userId));
    return new Set(s.server.filter((id) => !s.deleted.includes(id)));
  },

  /** Sign-out / other account: drop the offline copy of server data, keep unsent edits. */
  async clearCache(userId: string): Promise<void> {
    if (backendMode !== 'supabase') return;
    await withLock(userId, async () => {
      const s = await read(userId);
      await write(userId, { ...s, items: s.items.filter((t) => s.dirty.includes(t.id)) });
    });
  },
};
