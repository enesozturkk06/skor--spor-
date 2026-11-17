/**
 * Keyset pagination for workout history, shared by demo and Supabase mode.
 *
 * Order: newest first by started_at, ties broken by id (both descending).
 * A page continues strictly after the last row of the previous one:
 *   started_at < cursor.startedAt  OR  (started_at = cursor.startedAt AND id < cursor.id)
 * so rows with identical timestamps are never skipped or repeated, and
 * workouts saved while paging only ever appear above the first page.
 */
export type HistoryCursor = { startedAt: string; id: string };

type Keyed = { id: string; startedAt: string };

/** Newest first; equal start times by id, descending. */
export function newestFirst(a: Keyed, b: Keyed): number {
  const t = Date.parse(b.startedAt) - Date.parse(a.startedAt);
  return t !== 0 ? t : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** True when `w` comes after the cursor in newest-first order. */
export function isAfter(w: Keyed, c: HistoryCursor): boolean {
  const t = Date.parse(w.startedAt);
  const ct = Date.parse(c.startedAt);
  return t < ct || (t === ct && w.id < c.id);
}

/** One page of an in-memory list (demo store), same semantics as the server query. */
export function pageOf<T extends Keyed>(list: readonly T[], cursor: HistoryCursor | null, limit: number): { items: T[]; next: HistoryCursor | null } {
  const sorted = [...list].sort(newestFirst);
  const rest = cursor ? sorted.filter((w) => isAfter(w, cursor)) : sorted;
  const items = rest.slice(0, limit);
  const last = items[items.length - 1];
  return { items, next: items.length === limit && rest.length > limit && last ? { startedAt: last.startedAt, id: last.id } : null };
}

/** Union by id (the newer copy wins), newest first. */
export function mergeById<T extends Keyed>(...lists: readonly (readonly T[])[]): T[] {
  const m = new Map<string, T>();
  for (const list of lists) for (const w of list) m.set(w.id, w);
  return [...m.values()].sort(newestFirst);
}

/** PostgREST filter for "after the cursor" (values quoted: ISO times contain '.' and ':'). */
export function cursorFilter(c: HistoryCursor): string {
  return `started_at.lt."${c.startedAt}",and(started_at.eq."${c.startedAt}",id.lt."${c.id}")`;
}
