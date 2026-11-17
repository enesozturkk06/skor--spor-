import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import type { SportId } from '@/features/athlete/catalog';
import { useAuth } from '@/features/auth/AuthProvider';

import { activeWorkoutStore } from './active-workout-store';
import { isAfter, mergeById, type HistoryCursor } from './pagination';
import { SESSION_REJECTED, remoteTrainingEnabled, trainingRepository, TrainingError, type HistoryResult } from './training-repository';
import { templateRepository, TemplateError, type TemplatesResult } from './template-repository';
import { activeFromTemplate, duplicateTemplate as copyOf } from './template-model';
import type { ActiveWorkout, WorkoutEntry, WorkoutTemplate } from './types';
import * as model from './workout-model';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'auth';

type TrainingContextValue = {
  /** Draft and history for the current user have been read. */
  ready: boolean;
  active: ActiveWorkout | null;
  history: WorkoutEntry[];
  historyStatus: 'loading' | 'ok' | 'stale' | 'error';
  historyError: string | null;
  /**
   * True once every page of the history has been read. Records and XP need
   * the whole history, so they wait for this.
   */
  historyComplete: boolean;
  /** While loading: everything started at or after this time is loaded (null when complete or empty). */
  historyLoadedUntil: string | null;
  /** Older pages are being fetched right now (false once complete, or after a failed page — refresh retries). */
  historyLoading: boolean;
  pendingCount: number;
  /** Deletions made offline that still have to reach the server. */
  pendingDeletes: number;
  rejectedCount: number;
  syncStatus: SyncStatus;

  start: (o: { name: string; sport: SportId; templateId?: string | null }) => ActiveWorkout;
  addExercise: (exerciseKey: string) => void;
  removeExercise: (exUid: string) => void;
  addSet: (exUid: string) => void;
  removeSet: (exUid: string, setUid: string) => void;
  updateSet: (exUid: string, setUid: string, patch: model.SetPatch) => void;
  setDone: (exUid: string, setUid: string, done: boolean) => void;
  /** Applies a pure model change (workout-model) to the draft and saves it. Throws the model's errors. */
  editActive: (fn: (w: ActiveWorkout) => ActiveWorkout) => void;
  /** Ends the workout. Resolves once it is stored (synced or safely queued). Throws a user-facing Error. */
  finish: (o?: { rpe?: number | null; notes?: string | null }) => Promise<{ sync: 'synced' | 'pending' }>;
  discard: () => void;
  deleteWorkout: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;

  /** The athlete's own programs (built-in ones live in builtin-templates.ts). */
  templates: WorkoutTemplate[];
  templatesStatus: 'loading' | 'ok' | 'stale' | 'error';
  /** Create or update. Throws a user-facing Error (validation). */
  saveTemplate: (t: WorkoutTemplate) => Promise<WorkoutTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
  /** Saved copy of one of the athlete's programs. */
  duplicateTemplate: (t: WorkoutTemplate) => Promise<WorkoutTemplate>;
  /** One tap: the program becomes the running workout. Throws if one is already running. */
  startFromTemplate: (t: WorkoutTemplate) => ActiveWorkout;
};

type UserState = {
  userId: string;
  active: ActiveWorkout | null;
  history: WorkoutEntry[];
  historyStatus: 'ok' | 'stale' | 'error';
  historyError: string | null;
  pendingDeletes: number;
  historyNext: HistoryCursor | null;
  historyComplete: boolean;
  templates: WorkoutTemplate[];
  templatesStatus: 'ok' | 'stale' | 'error';
};

const fromTemplates = (r: TemplatesResult): Pick<UserState, 'templates' | 'templatesStatus'> =>
  r.status === 'error' ? { templates: [], templatesStatus: 'error' } : { templates: r.templates, templatesStatus: r.status };

/** Retry delays while workouts wait in the outbox (then every 60 s). */
const BACKOFF_MS = [3_000, 10_000, 30_000, 60_000];

const TrainingContext = createContext<TrainingContextValue | null>(null);

type HistoryFields = Pick<UserState, 'history' | 'historyStatus' | 'historyError' | 'pendingDeletes' | 'historyNext' | 'historyComplete'>;

const fromHistory = (r: HistoryResult): HistoryFields =>
  r.status === 'error'
    ? { history: [], historyStatus: 'error', historyError: r.message, pendingDeletes: 0, historyNext: null, historyComplete: false }
    : {
        history: r.entries,
        historyStatus: r.status,
        historyError: null,
        pendingDeletes: r.pendingDeletes ?? 0,
        historyNext: r.next,
        historyComplete: r.next === null && !r.partial,
      };

/**
 * A fresh first page merged with what was already loaded: older pages are
 * kept (no restart of the background load after every sync).
 */
function mergeFirstPage(prev: UserState, r: HistoryResult): HistoryFields {
  const next = fromHistory(r);
  if (r.status === 'error' || r.next === null || prev.historyStatus === 'error') return next;
  const older = prev.history.filter((e) => e.sync === 'synced' && isAfter(e, r.next!));
  if (!older.length) return next;
  return {
    ...next,
    history: mergeById(r.entries, older),
    historyNext: prev.historyComplete ? null : (prev.historyNext ?? r.next),
    historyComplete: prev.historyComplete,
  };
}

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<UserState | null>(null);
  // Tagged with its user like `state`: another account always starts from 'idle'.
  const [sync, setSync] = useState<{ userId: string | null; status: SyncStatus; retry: number }>({ userId: null, status: 'idle', retry: 0 });
  const syncStatus: SyncStatus = sync.userId === userId ? sync.status : 'idle';
  const retry = sync.userId === userId ? sync.retry : 0;
  const mark = useCallback((uid: string, status: SyncStatus, attempts: 'keep' | 'bump' | 'reset' = 'keep') => {
    setSync((p) => {
      const prev = p.userId === uid ? p.retry : 0;
      return { userId: uid, status, retry: attempts === 'bump' ? prev + 1 : attempts === 'reset' ? 0 : prev };
    });
  }, []);
  const finishing = useRef(false);
  const previousUserId = useRef<string | null>(null);

  // Everything below only ever touches the CURRENT user's state.
  const current = state && state.userId === userId ? state : null;
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  });

  // Another account (or signed out): drop the previous athlete's offline copy.
  // Their outbox and unfinished draft stay on the device under their own id
  // and resume only when that same athlete signs in again.
  useEffect(() => {
    const prev = previousUserId.current;
    if (prev && prev !== userId) {
      void trainingRepository.clearCache(prev);
      void templateRepository.clearCache(prev);
    }
    previousUserId.current = userId;
  }, [userId]);

  const loadFor = useCallback(async (uid: string) => {
    const [active, history, templates] = await Promise.all([
      activeWorkoutStore.load(uid),
      trainingRepository.loadHistory(uid).catch(
        (e): HistoryResult => (console.warn('[training] load failed', e), { status: 'error', reason: 'network', message: 'Antrenmanlar yüklenemedi.' }),
      ),
      templateRepository.load(uid).catch((): TemplatesResult => ({ status: 'error', reason: 'network', message: '' })),
    ]);
    // Finished before a crash but the draft was not cleared yet: it is in history now.
    const finished = active && history.status !== 'error' && history.entries.some((e) => e.id === active.id);
    if (finished) await activeWorkoutStore.save(uid, null);
    return { userId: uid, active: finished ? null : active, ...fromHistory(history), ...fromTemplates(templates) } satisfies UserState;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void loadFor(userId).then((s) => {
      if (!alive) return;
      setState(s);
      if (s.historyStatus === 'error' && s.historyError === SESSION_REJECTED) mark(s.userId, 'auth');
    });
    return () => {
      alive = false;
    };
  }, [userId, loadFor, mark]);

  /* --------------------------------------------------------- draft */

  const commitActive = useCallback((next: ActiveWorkout | null) => {
    const cur = currentRef.current;
    if (!cur) return;
    const updated = { ...cur, active: next };
    currentRef.current = updated;
    setState(updated);
    void activeWorkoutStore.save(cur.userId, next);
  }, []);

  const edit = useCallback(
    (fn: (w: ActiveWorkout) => ActiveWorkout) => {
      const w = currentRef.current?.active;
      if (!w) return;
      const next = fn(w);
      if (next !== w) commitActive(next); // unchanged: no write
    },
    [commitActive],
  );

  const start = useCallback<TrainingContextValue['start']>(
    (o) => {
      const cur = currentRef.current;
      if (!cur) throw new Error('Oturum bulunamadı.');
      if (cur.active) return cur.active; // one workout at a time
      const w = model.createActiveWorkout({ userId: cur.userId, ...o });
      commitActive(w);
      return w;
    },
    [commitActive],
  );

  const startFromTemplate = useCallback<TrainingContextValue['startFromTemplate']>(
    (t) => {
      const cur = currentRef.current;
      if (!cur) throw new Error('Oturum bulunamadı.');
      if (cur.active) throw new Error('Devam eden bir antrenmanın var. Önce onu bitir ya da sil.');
      const w = activeFromTemplate(t, cur.userId);
      commitActive(w);
      return w;
    },
    [commitActive],
  );

  /* ----------------------------------------------------------- sync */

  const applyHistory = useCallback((uid: string, r: HistoryResult) => {
    setState((s) => (s && s.userId === uid ? { ...s, ...mergeFirstPage(s, r) } : s));
  }, []);

  const syncNow = useCallback(async () => {
    const uid = currentRef.current?.userId;
    if (!uid || !remoteTrainingEnabled) return;
    mark(uid, 'syncing');
    const res = await trainingRepository.flush(uid).catch(() => null);
    if (currentRef.current?.userId !== uid) return;
    if (!res || res.status === 'offline') {
      mark(uid, 'offline', 'bump');
      return;
    }
    if (res.status === 'auth') {
      mark(uid, 'auth');
      applyHistory(uid, { status: 'error', reason: 'auth', message: SESSION_REJECTED });
      return;
    }
    mark(uid, 'idle', 'reset');
    applyHistory(uid, await trainingRepository.loadHistory(uid));
  }, [applyHistory, mark]);

  const refresh = useCallback(async () => {
    const uid = currentRef.current?.userId;
    if (!uid) return;
    const [r, t] = await Promise.all([trainingRepository.loadHistory(uid), templateRepository.load(uid)]);
    applyHistory(uid, r);
    setState((s) => (s && s.userId === uid ? { ...s, ...fromTemplates(t) } : s));
    mark(uid, r.status === 'error' && r.reason === 'auth' ? 'auth' : 'idle');
  }, [applyHistory, mark]);

  /* ------------------------------------------------------- programs */

  const setTemplates = useCallback((uid: string, fn: (list: WorkoutTemplate[]) => WorkoutTemplate[]) => {
    setState((s) => (s && s.userId === uid ? { ...s, templates: fn(s.templates) } : s));
  }, []);

  const saveTemplate = useCallback(
    async (t: WorkoutTemplate) => {
      const uid = currentRef.current?.userId;
      if (!uid) throw new Error('Oturum bulunamadı.');
      try {
        const saved = await templateRepository.save(t, uid);
        setTemplates(uid, (list) => [saved, ...list.filter((x) => x.id !== saved.id)]);
        return saved;
      } catch (e) {
        if (e instanceof TemplateError) throw new Error(e.message);
        console.warn('[programs] save failed', e);
        throw new Error('Program kaydedilemedi. Lütfen tekrar dene.');
      }
    },
    [setTemplates],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const uid = currentRef.current?.userId;
      if (!uid) return;
      await templateRepository.remove(uid, id);
      setTemplates(uid, (list) => list.filter((x) => x.id !== id));
    },
    [setTemplates],
  );

  const duplicateTemplate = useCallback(
    (t: WorkoutTemplate) => {
      const uid = currentRef.current?.userId;
      if (!uid) throw new Error('Oturum bulunamadı.');
      return saveTemplate(copyOf(t, uid));
    },
    [saveTemplate],
  );

  // Older pages, one request at a time in the background, until the whole
  // history is on the device. A failed page stops the loop (refresh retries).
  const next = current?.historyNext ?? null;
  const nextKey = next ? next.startedAt + '|' + next.id : null;
  useEffect(() => {
    if (!userId || !nextKey) return;
    const sep = nextKey.lastIndexOf('|');
    const cursor: HistoryCursor = { startedAt: nextKey.slice(0, sep), id: nextKey.slice(sep + 1) };
    let alive = true;
    void trainingRepository.loadMore(userId, cursor).then((r) => {
      const s = currentRef.current;
      if (!alive || !s || s.userId !== userId || s.historyNext?.id !== cursor.id) return;
      if (r.status === 'error') {
        if (r.reason === 'auth') mark(userId, 'auth');
        setState((x) => (x && x.userId === userId ? { ...x, historyNext: null, historyComplete: false } : x));
        return;
      }
      const history = mergeById(s.history, r.entries);
      const done = r.next === null;
      if (done) void trainingRepository.saveCompleteCache(userId, history);
      setState((x) => (x && x.userId === userId ? { ...x, history: mergeById(x.history, r.entries), historyNext: r.next, historyComplete: done } : x));
    });
    return () => {
      alive = false;
    };
  }, [userId, nextKey, mark]);

  const pendingCount = current?.history.filter((e) => e.sync === 'pending').length ?? 0;
  const pendingDeletes = current?.pendingDeletes ?? 0;
  const pendingWork = pendingCount + pendingDeletes;
  const rejectedCount = current?.history.filter((e) => e.sync === 'rejected').length ?? 0;

  // Automatic upload: right away, then with backoff while offline. A rejected
  // session stops retries (a new sign-in or a manual retry starts them again).
  useEffect(() => {
    if (!remoteTrainingEnabled || !pendingWork || syncStatus === 'auth' || syncStatus === 'syncing') return;
    const delay = syncStatus === 'offline' ? BACKOFF_MS[Math.min(retry - 1, BACKOFF_MS.length - 1)] : 0;
    const t = setTimeout(() => void syncNow(), delay);
    return () => clearTimeout(t);
  }, [pendingWork, syncStatus, retry, syncNow]);

  // Connectivity back / app back in front: try now instead of waiting.
  useEffect(() => {
    if (!remoteTrainingEnabled || !pendingWork) return;
    const kick = () => {
      if (syncStatus !== 'syncing') void syncNow();
    };
    const sub = AppState.addEventListener('change', (s) => s === 'active' && kick());
    const online = Platform.OS === 'web' && typeof window !== 'undefined';
    if (online) window.addEventListener('online', kick);
    return () => {
      sub.remove();
      if (online) window.removeEventListener('online', kick);
    };
  }, [pendingWork, syncStatus, syncNow]);

  /* --------------------------------------------------------- finish */

  const finish = useCallback<TrainingContextValue['finish']>(async (o = {}) => {
    const cur = currentRef.current;
    if (!cur?.active) throw new Error('Devam eden antrenman yok.');
    if (finishing.current) throw new Error('Antrenman kaydediliyor…');
    finishing.current = true;
    try {
      const workout = model.finalizeWorkout(cur.active, o);
      const res = await trainingRepository.saveWorkout(workout);
      if (currentRef.current?.userId !== cur.userId) return res;
      // Stored (or durably queued) — only now may the draft go.
      await activeWorkoutStore.save(cur.userId, null);
      setState((s) => {
        if (!s || s.userId !== cur.userId) return s;
        const entry: WorkoutEntry = { ...workout, sync: res.sync };
        const next = { ...s, active: null, history: [entry, ...s.history.filter((e) => e.id !== workout.id)] };
        currentRef.current = next;
        return next;
      });
      if (res.sync === 'pending' && remoteTrainingEnabled) {
        mark(cur.userId, 'offline', 'bump');
      }
      return res;
    } catch (e) {
      if (e instanceof model.WorkoutError || e instanceof TrainingError) throw new Error(e.message);
      console.warn('[training] finish failed', e);
      throw new Error('Antrenman kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      finishing.current = false;
    }
  }, [mark]);

  const deleteWorkout = useCallback(async (id: string) => {
    const uid = currentRef.current?.userId;
    if (!uid) return;
    const { pendingOnServer } = await trainingRepository.deleteWorkout(uid, id);
    setState((s) =>
      s && s.userId === uid ? { ...s, history: s.history.filter((e) => e.id !== id), pendingDeletes: s.pendingDeletes + (pendingOnServer ? 1 : 0) } : s,
    );
    // Offline: the queued deletion is retried with the usual backoff.
    if (pendingOnServer) mark(uid, 'offline', 'bump');
  }, [mark]);

  const value = useMemo<TrainingContextValue>(
    () => ({
      ready: Boolean(current),
      active: current?.active ?? null,
      history: current?.history ?? [],
      historyStatus: current ? current.historyStatus : 'loading',
      historyError: current?.historyError ?? null,
      historyComplete: current?.historyComplete ?? false,
      historyLoading: Boolean(current?.historyNext),
      historyLoadedUntil: current && !current.historyComplete ? oldestSynced(current.history) : null,
      pendingCount,
      pendingDeletes,
      rejectedCount,
      syncStatus,
      start,
      addExercise: (key) => edit((w) => model.addExercise(w, key)),
      removeExercise: (exUid) => edit((w) => model.removeExercise(w, exUid)),
      addSet: (exUid) => edit((w) => model.addSet(w, exUid)),
      removeSet: (exUid, setUid) => edit((w) => model.removeSet(w, exUid, setUid)),
      updateSet: (exUid, setUid, patch) => edit((w) => model.updateSet(w, exUid, setUid, patch)),
      setDone: (exUid, setUid, done) => edit((w) => model.setDone(w, exUid, setUid, done)),
      editActive: edit,
      finish,
      discard: () => commitActive(null),
      deleteWorkout,
      syncNow,
      refresh,
      templates: current?.templates ?? [],
      templatesStatus: current ? current.templatesStatus : 'loading',
      saveTemplate,
      deleteTemplate,
      duplicateTemplate,
      startFromTemplate,
    }),
    [current, pendingCount, pendingDeletes, rejectedCount, syncStatus, start, edit, finish, commitActive, deleteWorkout, syncNow, refresh, saveTemplate, deleteTemplate, duplicateTemplate, startFromTemplate],
  );

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}


/** Start of the oldest server-confirmed workout loaded so far (pages are contiguous from the newest). */
function oldestSynced(history: readonly WorkoutEntry[]): string | null {
  let min: string | null = null;
  for (const e of history) if (e.sync === 'synced' && (min === null || Date.parse(e.startedAt) < Date.parse(min))) min = e.startedAt;
  return min;
}

export function useTraining(): TrainingContextValue {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTraining must be used inside <TrainingProvider>');
  return ctx;
}
