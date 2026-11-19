import { backendMode, storageKeys } from '@/lib/backend';
import { env } from '@/lib/env';
import { storage } from '@/lib/storage';
import { getSupabase, hasSupabase } from '@/lib/supabase';

import { cursorFilter, mergeById, newestFirst, pageOf, type HistoryCursor } from './pagination';
import { SESSION_REJECTED, classify, isPostgrestError } from './sync-errors';
import { templateRepository } from './template-repository';
import type { LoggedSet, Workout, WorkoutEntry } from './types';
import { sanitizeWorkout, toSavePayload } from './workout-model';

/**
 * Training data access for both backends.
 *
 * Demo:      the device store IS the data (AsyncStorage, per user).
 * Supabase:  every finished workout goes to a durable device OUTBOX first,
 *            then is uploaded with the save_workout RPC. The workout id is
 *            generated on the device, and the RPC ignores an id it already
 *            has, so retries after a lost response never create duplicates.
 *            The last server copy is cached for offline viewing only — it is
 *            removed when the server rejects the session.
 *
 * Remote calls happen only when EXPO_PUBLIC_TRAINING_SYNC=1 (the tables are
 * not live yet); until then Supabase-mode workouts wait in the outbox.
 */
export const remoteTrainingEnabled = backendMode === 'supabase' && env.trainingSync && hasSupabase;

export type HistoryResult =
  | {
      status: 'ok' | 'stale';
      entries: WorkoutEntry[];
      pendingDeletes?: number;
      /** Where the next page starts; null = nothing more to load. */
      next: HistoryCursor | null;
      /** Offline and the device copy is not the complete history (records/score must wait). */
      partial?: boolean;
    }
  | { status: 'error'; reason: 'auth' | 'network'; message: string };

export type FlushResult = {
  /** idle: nothing to send · synced: outbox emptied · offline / auth: stopped, will retry. */
  status: 'idle' | 'synced' | 'offline' | 'auth' | 'disabled';
  synced: string[];
  pending: number;
  rejected: number;
};

export class TrainingError extends Error {
  constructor(
    message: string,
    readonly reason: 'invalid' | 'network' | 'auth' | 'other' = 'other',
  ) {
    super(message);
  }
}

export { SESSION_REJECTED };
const OFFLINE = 'Sunucuya ulaşılamıyor. Antrenmanların bu cihazda güvende; bağlantı gelince otomatik gönderilecek.';

type OutboxItem = { workout: Workout; state: 'pending' | 'rejected'; attempts: number; queuedAt: string; error?: string };

/* ------------------------------------------------------------------ */
/* Per-user lock: read-modify-write of the stores never interleaves     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Device stores                                                       */
/* ------------------------------------------------------------------ */

const byNewest = newestFirst;

/**
 * Reads a workout list. The demo store is a plain array; the Supabase offline
 * cache is `{ items, complete }` (complete = it holds the whole server history).
 */
async function readList(key: string, userId: string): Promise<Workout[]> {
  const raw = await storage.get<unknown>(key);
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: unknown[] }).items : [];
  return list.map((w) => sanitizeWorkout(w, userId)).filter((w): w is Workout => w !== null);
}

async function readCacheComplete(userId: string): Promise<boolean> {
  const raw = await storage.get<{ complete?: unknown }>(storageKeys.trainingHistory(userId));
  return Boolean(raw && !Array.isArray(raw) && raw.complete === true);
}

/** Offline copy of server data. `complete` is kept unless given. */
async function writeCache(userId: string, items: Workout[], complete?: boolean) {
  const keep = complete ?? (await readCacheComplete(userId));
  await storage.set(storageKeys.trainingHistory(userId), { items: [...items].sort(newestFirst), complete: keep });
}

/** Ids of workouts deleted on this device that still have to be deleted on the server. */
async function readDeletes(userId: string): Promise<string[]> {
  const raw = await storage.get<unknown[]>(storageKeys.trainingDeletes(userId));
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
}
const writeDeletes = (userId: string, ids: string[]) =>
  ids.length ? storage.set(storageKeys.trainingDeletes(userId), ids) : storage.remove(storageKeys.trainingDeletes(userId));

async function readOutbox(userId: string): Promise<OutboxItem[]> {
  const raw = await storage.get<unknown[]>(storageKeys.trainingOutbox(userId));
  if (!Array.isArray(raw)) return [];
  const out: OutboxItem[] = [];
  for (const r of raw) {
    const item = r as Partial<OutboxItem>;
    const workout = sanitizeWorkout(item?.workout, userId);
    if (!workout) continue;
    out.push({
      workout,
      state: item.state === 'rejected' ? 'rejected' : 'pending',
      attempts: typeof item.attempts === 'number' ? item.attempts : 0,
      queuedAt: typeof item.queuedAt === 'string' ? item.queuedAt : new Date().toISOString(),
      error: typeof item.error === 'string' ? item.error : undefined,
    });
  }
  return out;
}

const writeOutbox = (userId: string, items: OutboxItem[]) =>
  items.length ? storage.set(storageKeys.trainingOutbox(userId), items) : storage.remove(storageKeys.trainingOutbox(userId));

const outboxEntries = (items: OutboxItem[]): WorkoutEntry[] =>
  items.map((i) => ({ ...i.workout, sync: i.state, ...(i.error ? { syncError: i.error } : {}) }));

/* ------------------------------------------------------------------ */
/* Supabase rows                                                       */
/* ------------------------------------------------------------------ */

type SetRow = {
  exercise_key: string;
  exercise_name: string;
  position: number;
  set_index: number;
  kind: string;
  reps: number | null;
  weight_kg: number | string | null;
  duration_s: number | null;
  distance_m: number | null;
  rest_s: number | null;
  rpe: number | null;
  completed_at: string | null;
};
type WorkoutRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  sport: string;
  started_at: string;
  ended_at: string;
  rpe: number | null;
  notes: string | null;
  workout_sets: SetRow[] | null;
};

/** First screenful fast, then the rest in pages of PAGE_SIZE (see TrainingProvider). */
export const FIRST_PAGE = 50;
export const PAGE_SIZE = 100;
const SELECT =
  'id, user_id, template_id, name, sport, started_at, ended_at, rpe, notes, workout_sets(exercise_key, exercise_name, position, set_index, kind, reps, weight_kg, duration_s, distance_m, rest_s, rpe, completed_at)';

const fromRow = (r: WorkoutRow) => ({
  id: r.id,
  userId: r.user_id,
  templateId: r.template_id,
  name: r.name,
  sport: r.sport,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  rpe: r.rpe,
  notes: r.notes,
  sets: (r.workout_sets ?? [])
    .map(
      (s): LoggedSet => ({
        exerciseKey: s.exercise_key,
        exerciseName: s.exercise_name,
        position: s.position,
        setIndex: s.set_index,
        kind: s.kind as LoggedSet['kind'],
        reps: s.reps,
        // numeric columns may arrive as strings
        weightKg: s.weight_kg === null ? null : Number(s.weight_kg),
        durationS: s.duration_s,
        distanceM: s.distance_m,
        restS: s.rest_s,
        rpe: s.rpe,
        completedAt: s.completed_at,
      }),
    )
    .sort((a, b) => a.position - b.position || a.setIndex - b.setIndex),
});

/**
 * One page of the athlete's workouts, newest first (keyset: started_at, id).
 * The cursor uses the server's own timestamp string, so precision can never
 * make a row fall between pages.
 */
async function fetchPage(userId: string, cursor: HistoryCursor | null, limit: number): Promise<{ items: Workout[]; next: HistoryCursor | null }> {
  const client = await getSupabase();
  let q = client.from('workouts').select(SELECT).eq('user_id', userId);
  if (cursor) q = q.or(cursorFilter(cursor));
  const { data, error } = await q.order('started_at', { ascending: false }).order('id', { ascending: false }).limit(limit).returns<WorkoutRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const last = rows[rows.length - 1];
  return {
    items: rows.map((r) => sanitizeWorkout(fromRow(r), userId)).filter((w): w is Workout => w !== null),
    next: rows.length === limit && last ? { startedAt: last.started_at, id: last.id } : null,
  };
}

async function sendRemote(w: Workout): Promise<void> {
  const { error } = await (await getSupabase()).rpc('save_workout', { p: toSavePayload(w) });
  if (error) throw error;
}

/** An outbox item that is already on the server was saved and its answer got lost: done. */
async function confirmSaved(userId: string, onServer: readonly Workout[]) {
  const ids = new Set(onServer.map((w) => w.id));
  await withLock(userId, async () => {
    const items = await readOutbox(userId);
    if (items.some((i) => ids.has(i.workout.id))) await writeOutbox(userId, items.filter((i) => !ids.has(i.workout.id)));
  });
}

/* ------------------------------------------------------------------ */
/* Flush (upload the outbox)                                           */
/* ------------------------------------------------------------------ */

const inFlight = new Map<string, Promise<FlushResult>>();

async function flushLocked(userId: string): Promise<FlushResult> {
  const items = await readOutbox(userId);
  const result: FlushResult = { status: 'idle', synced: [], pending: 0, rejected: 0 };
  if (!remoteTrainingEnabled) {
    return { ...result, status: 'disabled', pending: items.filter((i) => i.state === 'pending').length, rejected: items.filter((i) => i.state === 'rejected').length };
  }
  // Deletions first: once the server confirms them they can never come back.
  const deletes = await readDeletes(userId);
  const leftDeletes: string[] = [];
  let deleteStop: 'offline' | 'auth' | null = null;
  for (const id of deletes) {
    if (deleteStop) {
      leftDeletes.push(id);
      continue;
    }
    try {
      // RLS + explicit owner filter: only the caller's own row can ever match.
      const { error } = await (await getSupabase()).from('workouts').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      leftDeletes.push(id);
      deleteStop = classify(error) === 'auth' ? 'auth' : 'offline';
    }
  }
  if (deletes.length) await writeDeletes(userId, leftDeletes);
  if (deleteStop) {
    if (deleteStop === 'auth') await storage.remove(storageKeys.trainingHistory(userId));
    return { ...result, status: deleteStop, pending: items.filter((i) => i.state === 'pending').length, rejected: items.filter((i) => i.state === 'rejected').length };
  }

  const todo = items.filter((i) => i.state === 'pending');
  if (!todo.length) return { ...result, status: deletes.length ? 'synced' : 'idle', rejected: items.length };

  // Programs first: a workout may only reference a program the server has
  // (foreign key); an unsynced or deleted program is sent as "no program".
  await templateRepository.flush(userId).catch(() => 'offline');
  const knownTemplates = await templateRepository.serverIds(userId);

  let stop: 'offline' | 'auth' | null = null;
  const remaining: OutboxItem[] = [];
  const cached = await readList(storageKeys.trainingHistory(userId), userId);
  for (const item of items) {
    if (item.state !== 'pending' || stop) {
      remaining.push(item);
      continue;
    }
    try {
      const tid = item.workout.templateId;
      await sendRemote({ ...item.workout, templateId: tid && knownTemplates.has(tid) ? tid : null });
      result.synced.push(item.workout.id);
      if (!cached.some((c) => c.id === item.workout.id)) cached.push(item.workout);
    } catch (error) {
      const kind = classify(error);
      if (kind === 'permanent') {
        console.warn('[training] server refused workout', item.workout.id, isPostgrestError(error) ? error.code : error);
        remaining.push({ ...item, state: 'rejected', attempts: item.attempts + 1, error: 'Sunucu bu antrenmanı kabul etmedi.' });
      } else {
        remaining.push({ ...item, attempts: item.attempts + 1 });
        stop = kind === 'auth' ? 'auth' : 'offline';
      }
    }
  }
  await writeOutbox(userId, remaining);
  if (result.synced.length) await writeCache(userId, cached);
  if (stop === 'auth') await storage.remove(storageKeys.trainingHistory(userId));
  result.pending = remaining.filter((i) => i.state === 'pending').length;
  result.rejected = remaining.length - result.pending;
  result.status = stop ?? 'synced';
  return result;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const trainingRepository = {
  /**
   * First page of the history (newest FIRST_PAGE workouts) plus everything
   * still in the outbox. `next` tells where the remaining pages start; the
   * provider loads them in the background (loadMore) — the history is never
   * fetched in one big request.
   */
  async loadHistory(userId: string): Promise<HistoryResult> {
    if (backendMode === 'demo') {
      const list = await readList(storageKeys.trainingHistory(userId), userId);
      const page = pageOf(list, null, FIRST_PAGE);
      return { status: 'ok', entries: page.items.map((w) => ({ ...w, sync: 'synced' })), next: page.next };
    }
    const [outbox, deleted] = await withLock(userId, () => Promise.all([readOutbox(userId), readDeletes(userId)]));
    if (!remoteTrainingEnabled) return { status: 'ok', entries: outboxEntries(outbox).sort(byNewest), next: null };
    const gone = new Set(deleted);

    try {
      const page = await fetchPage(userId, null, FIRST_PAGE);
      // Deleted here but not yet on the server: never shown again.
      const remote = page.items.filter((w) => !gone.has(w.id));
      await confirmSaved(userId, remote);
      // Keep what the cache had beyond this page until the full reload replaces it.
      await withLock(userId, async () => writeCache(userId, mergeById(await readList(storageKeys.trainingHistory(userId), userId), remote), false));
      const onServer = new Set(remote.map((w) => w.id));
      const local = outboxEntries(outbox.filter((i) => !onServer.has(i.workout.id)));
      return {
        status: 'ok',
        entries: mergeById(remote.map((w): WorkoutEntry => ({ ...w, sync: 'synced' })), local),
        pendingDeletes: deleted.length,
        next: page.next,
      };
    } catch (error) {
      const kind = classify(error);
      console.warn('[training] history load failed', kind);
      if (kind === 'auth') {
        await storage.remove(storageKeys.trainingHistory(userId));
        return { status: 'error', reason: 'auth', message: SESSION_REJECTED };
      }
      const cached = await readList(storageKeys.trainingHistory(userId), userId);
      const complete = await readCacheComplete(userId);
      const queued = new Set(outbox.map((i) => i.workout.id));
      const entries = [...outboxEntries(outbox), ...cached.filter((w) => !queued.has(w.id) && !gone.has(w.id)).map((w): WorkoutEntry => ({ ...w, sync: 'synced' }))];
      if (entries.length || deleted.length) {
        return { status: 'stale', entries: entries.sort(byNewest), pendingDeletes: deleted.length, next: null, partial: !complete };
      }
      return { status: 'error', reason: 'network', message: 'Antrenman geçmişi yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.' };
    }
  },

  /** The page after `cursor` (same order and filters as loadHistory). */
  async loadMore(userId: string, cursor: HistoryCursor, limit = PAGE_SIZE): Promise<{ status: 'ok'; entries: WorkoutEntry[]; next: HistoryCursor | null } | { status: 'error'; reason: 'auth' | 'network' }> {
    if (backendMode === 'demo') {
      const page = pageOf(await readList(storageKeys.trainingHistory(userId), userId), cursor, limit);
      return { status: 'ok', entries: page.items.map((w) => ({ ...w, sync: 'synced' })), next: page.next };
    }
    if (!remoteTrainingEnabled) return { status: 'ok', entries: [], next: null };
    try {
      const gone = new Set(await readDeletes(userId));
      const page = await fetchPage(userId, cursor, limit);
      const items = page.items.filter((w) => !gone.has(w.id));
      await confirmSaved(userId, items);
      return { status: 'ok', entries: items.map((w): WorkoutEntry => ({ ...w, sync: 'synced' })), next: page.next };
    } catch (error) {
      const kind = classify(error);
      if (kind === 'auth') await storage.remove(storageKeys.trainingHistory(userId));
      return { status: 'error', reason: kind === 'auth' ? 'auth' : 'network' };
    }
  },

  /** After every page has been read: the offline copy becomes the exact, complete server history. */
  async saveCompleteCache(userId: string, entries: readonly WorkoutEntry[]): Promise<void> {
    if (backendMode !== 'supabase' || !remoteTrainingEnabled) return;
    const synced = entries.filter((e) => e.sync === 'synced').map(({ sync: _s, syncError: _e, ...w }) => w as Workout);
    await withLock(userId, () => writeCache(userId, synced, true));
  },

  /**
   * Stores a finished workout. Supabase: queued durably, then uploaded.
   * Saving the same id again is a no-op (double tap, retry after a crash).
   */
  async saveWorkout(workout: Workout): Promise<{ sync: 'synced' | 'pending' }> {
    const clean = sanitizeWorkout(workout, workout.userId);
    if (!clean) throw new TrainingError('Antrenman verisi geçersiz.', 'invalid');
    const { userId } = clean;

    if (backendMode === 'demo') {
      await withLock(userId, async () => {
        const key = storageKeys.trainingHistory(userId);
        const list = await readList(key, userId);
        if (!list.some((w) => w.id === clean.id)) await storage.set(key, [clean, ...list].sort(byNewest));
      });
      return { sync: 'synced' };
    }

    const alreadySynced = await withLock(userId, async () => {
      const cached = await readList(storageKeys.trainingHistory(userId), userId);
      if (cached.some((w) => w.id === clean.id)) return true;
      const items = await readOutbox(userId);
      if (!items.some((i) => i.workout.id === clean.id)) {
        items.push({ workout: clean, state: 'pending', attempts: 0, queuedAt: new Date().toISOString() });
        await writeOutbox(userId, items);
      }
      return false;
    });
    if (alreadySynced) return { sync: 'synced' };
    const flushed = await trainingRepository.flush(userId);
    return { sync: flushed.synced.includes(clean.id) ? 'synced' : 'pending' };
  },

  /** Uploads pending workouts in order. Concurrent calls share one run. */
  flush(userId: string): Promise<FlushResult> {
    const running = inFlight.get(userId);
    if (running) return running;
    const run = withLock(userId, () => flushLocked(userId)).finally(() => inFlight.delete(userId));
    inFlight.set(userId, run);
    return run;
  },

  /**
   * Deletes the athlete's own workout, offline too. It disappears from this
   * device at once; if the server may have it (synced, or sent and the answer
   * lost) a deletion is queued and sent with the next sync. Returns whether a
   * server deletion is still pending.
   */
  async deleteWorkout(userId: string, id: string): Promise<{ pendingOnServer: boolean }> {
    const pending = await withLock(userId, async () => {
      const historyKey = storageKeys.trainingHistory(userId);
      const remaining = (await readList(historyKey, userId)).filter((w) => w.id !== id);
      if (backendMode === 'demo') {
        await storage.set(historyKey, remaining); // the demo store itself
        return false;
      }
      await writeCache(userId, remaining);
      const items = await readOutbox(userId);
      const item = items.find((i) => i.workout.id === id);
      if (item) await writeOutbox(userId, items.filter((i) => i.workout.id !== id));
      // Never attempted = never on the server: the local removal is the whole delete.
      const mayBeOnServer = remoteTrainingEnabled && (!item || item.attempts > 0);
      if (mayBeOnServer) await writeDeletes(userId, [...new Set([...(await readDeletes(userId)), id])]);
      return mayBeOnServer;
    });
    if (!pending) return { pendingOnServer: false };
    const res = await trainingRepository.flush(userId);
    return { pendingOnServer: res.status === 'offline' || res.status === 'auth' };
  },

  /** Removes the offline copy of server data (sign-out, other account). The outbox is kept: unsent workouts are never thrown away. */
  async clearCache(userId: string): Promise<void> {
    if (backendMode !== 'supabase') return;
    await storage.remove(storageKeys.trainingHistory(userId));
  },

  offlineMessage: OFFLINE,
};
