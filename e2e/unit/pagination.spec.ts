/**
 * History pagination (keyset on started_at, id) and the score's coverage
 * rule: no duplicates, no gaps, stable order — also with identical start
 * times and with workouts added while paging.
 */
import { expect, test } from '@playwright/test';

import { buildDashboardSnapshot } from '../../src/features/dashboard/dashboard-data';
import { cursorFilter, isAfter, mergeById, newestFirst, pageOf, type HistoryCursor } from '../../src/features/training/pagination';
import type { WorkoutEntry } from '../../src/features/training/types';

const A = '11111111-1111-4111-8111-111111111111';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
type Row = { id: string; startedAt: string };

/** 257 rows; every 10th group of 3 shares one start time (ties by id). */
function rows(count = 257): Row[] {
  const base = Date.UTC(2026, 0, 1);
  return Array.from({ length: count }, (_, i) => ({ id: uuid(1000 - i), startedAt: new Date(base + Math.floor(i / 3) * 3_600_000).toISOString() }));
}

function readAll(list: readonly Row[], first: number, size: number) {
  const seen: Row[] = [];
  let page = pageOf(list, null, first);
  let requests = 1;
  seen.push(...page.items);
  while (page.next) {
    page = pageOf(list, page.next, size);
    requests += 1;
    seen.push(...page.items);
  }
  return { seen, requests };
}

test.describe('Geçmiş sayfalama', () => {
  test('tüm kayıtlar bir kez ve doğru sırada gelir (eşit zamanlar dahil)', () => {
    const all = rows();
    const { seen, requests } = readAll(all, 50, 100);
    expect(seen).toHaveLength(all.length);
    expect(new Set(seen.map((r) => r.id)).size, 'no duplicates').toBe(all.length);
    expect(seen.map((r) => r.id)).toEqual([...all].sort(newestFirst).map((r) => r.id));
    expect(requests).toBe(4); // 50 + 100 + 100 + 7
    for (let i = 1; i < seen.length; i++) expect(newestFirst(seen[i - 1], seen[i])).toBeLessThan(0);
  });

  test('120 antrenman aynı anda başlamış olsa bile hiçbiri atlanmaz', () => {
    const t = '2026-03-01T10:00:00.000Z';
    const same = Array.from({ length: 120 }, (_, i) => ({ id: uuid(i), startedAt: t }));
    const { seen } = readAll(same, 50, 50);
    expect(new Set(seen.map((r) => r.id)).size).toBe(120);
  });

  test('sayfalama sürerken eklenen yeni antrenman mevcut sayfaları kaydırmaz (çift/eksik yok)', () => {
    const all = rows(160);
    const p1 = pageOf(all, null, 50);
    const withNew = [...all, { id: uuid(9999), startedAt: '2027-01-01T00:00:00.000Z' }]; // newer than everything
    const p2 = pageOf(withNew, p1.next, 100);
    const p3 = pageOf(withNew, p2.next, 100);
    const seen = [...p1.items, ...p2.items, ...p3.items];
    expect(seen).toHaveLength(160);
    expect(new Set(seen.map((r) => r.id)).size).toBe(160);
    expect(p3.next).toBeNull();
  });

  test('imleç kuralı ve PostgREST filtresi', () => {
    const c: HistoryCursor = { startedAt: '2026-01-01T10:00:00.000Z', id: uuid(5) };
    expect(isAfter({ id: uuid(9), startedAt: '2026-01-01T09:59:59.999Z' }, c)).toBe(true);
    expect(isAfter({ id: uuid(4), startedAt: c.startedAt }, c)).toBe(true);
    expect(isAfter({ id: uuid(5), startedAt: c.startedAt }, c), 'the cursor row itself').toBe(false);
    expect(isAfter({ id: uuid(6), startedAt: c.startedAt }, c)).toBe(false);
    expect(cursorFilter(c)).toBe(`started_at.lt."${c.startedAt}",and(started_at.eq."${c.startedAt}",id.lt."${c.id}")`);
    const merged = mergeById([{ id: uuid(1), startedAt: c.startedAt }], [{ id: uuid(1), startedAt: c.startedAt }, { id: uuid(2), startedAt: c.startedAt }]);
    expect(merged.map((r) => r.id)).toEqual([uuid(2), uuid(1)]);
  });
});

test.describe('Skor yalnızca tüm tarih aralığı yüklenince', () => {
  const profile = { userId: A, primarySport: 'fitness' as const, secondarySports: [], goals: [], age: 27, heightCm: 178, weightKg: 75, createdAt: '', updatedAt: '' };
  const now = new Date(2026, 10, 12, 20, 0);
  const day = (back: number) => new Date(2026, 10, 12 - back, 18, 0);
  const history: WorkoutEntry[] = Array.from({ length: 10 }, (_, i) => ({
    id: uuid(i + 1),
    userId: A,
    name: 'Push',
    sport: 'fitness',
    templateId: null,
    startedAt: day(i * 2).toISOString(),
    endedAt: new Date(day(i * 2).getTime() + 45 * 60_000).toISOString(),
    rpe: null,
    notes: null,
    sets: [{ exerciseKey: 'bench_press', exerciseName: 'Bench', position: 1, setIndex: 1, kind: 'normal', reps: 5, weightKg: 60, durationS: null, distanceM: null, restS: null, rpe: null, completedAt: null }],
    sync: 'synced',
  }));

  test('yüklenen en eski kayıt 35 günlük pencerenin içindeyse skor "yükleniyor" kalır', () => {
    const partial = buildDashboardSnapshot(profile, history.slice(0, 5), now, { complete: false, loadedUntil: day(8).toISOString() });
    expect(partial.score).toEqual({ status: 'loading' });
  });

  test('pencerenin başından eski bir kayda kadar yüklendiyse ya da geçmiş tamsa skor hesaplanır ve aynı sonucu verir', () => {
    const covered = buildDashboardSnapshot(profile, history, now, { complete: false, loadedUntil: day(40).toISOString() });
    const complete = buildDashboardSnapshot(profile, history, now, { complete: true, loadedUntil: null });
    expect(covered.score.status).toBe('ready');
    expect(covered.score).toEqual(complete.score);
  });
});
