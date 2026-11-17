/**
 * Phase 3E pure logic: personal records (Epley, metric separation, warm-ups),
 * XP / levels, streaks, the transparent training score and the dashboard
 * snapshot built from real workouts. Local-time dates on purpose (the app
 * counts a workout on the athlete's calendar day).
 */
import { expect, test } from '@playwright/test';

import { CALIBRATION_WORKOUTS, computeTrainingScore } from '../../src/features/dashboard/athlete-score';
import { buildDashboardSnapshot } from '../../src/features/dashboard/dashboard-data';
import { levelFor, previousComparable, streakDays, workoutStats, workoutXp } from '../../src/features/training/progress';
import { computeRecords, epley, formatRecord, recordCountsByWorkout, recordsSetBy, sessionBests } from '../../src/features/training/records';
import type { LoggedSet, WorkoutEntry } from '../../src/features/training/types';

const A = '11111111-1111-4111-8111-111111111111';
const NOW = new Date(2026, 10, 12, 20, 0); // Thursday 12 Nov 2026, 20:00 local
let n = 0;

function set(exerciseKey: string, p: Partial<LoggedSet> = {}): LoggedSet {
  return { exerciseKey, exerciseName: exerciseKey, position: 1, setIndex: 1, kind: 'normal', reps: null, weightKg: null, durationS: null, distanceM: null, restS: null, rpe: null, completedAt: null, ...p };
}
/** A workout `daysAgo` days before NOW at 18:00, lasting `minutes`. */
function wk(daysAgo: number, sets: LoggedSet[], o: Partial<WorkoutEntry> = {}): WorkoutEntry {
  n += 1;
  const start = new Date(2026, 10, 12 - daysAgo, 18, 0);
  const numbered = sets.map((s, i) => ({ ...s, setIndex: s.setIndex === 1 ? i + 1 : s.setIndex }));
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    userId: A,
    name: 'Push',
    sport: 'fitness',
    templateId: null,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + (o.endedAt ? 0 : 50 * 60_000)).toISOString(),
    rpe: null,
    notes: null,
    sets: numbered,
    sync: 'synced',
    ...o,
  };
}
const bench = (kg: number, reps: number, kind: LoggedSet['kind'] = 'normal') => set('bench_press', { weightKg: kg, reps, kind });

test.describe('Kişisel rekorlar', () => {
  test('Epley yalnızca 1–12 tekrar ve yükle', () => {
    expect(epley(100, 5)).toBe(116.7);
    expect(epley(100, 1)).toBe(103.3);
    expect(epley(100, 12)).toBe(140);
    expect(epley(100, 13)).toBeNull();
    expect(epley(100, 0)).toBeNull();
    expect(epley(0, 5)).toBeNull();
    expect(epley(60, 2.5)).toBeNull();
  });

  test('ısınma setleri sayılmaz; ölçüm türleri karışmaz', () => {
    const w = wk(1, [bench(140, 1, 'warmup'), bench(80, 8), bench(90, 3), set('push_up', { reps: 30 }), set('plank', { durationS: 90 })]);
    const b = sessionBests(w, 'bench_press');
    // 80×8 → 101,3 beats 90×3 → 99 on estimated 1RM; the 140 kg warm-up is ignored; no "reps" record for loaded sets.
    expect(b).toEqual({ e1rm: 101.3, weight: 90, volume: 80 * 8 + 90 * 3 });
    expect(sessionBests(w, 'push_up')).toEqual({ reps: 30 });
    expect(sessionBests(w, 'plank')).toEqual({ duration: 90 });
    const run = wk(1, [set('interval_run', { distanceM: 400, durationS: 100 }), set('interval_run', { distanceM: 400, durationS: 96 })]);
    expect(sessionBests(run, 'interval_run')).toEqual({ distance: 400, pace: 240, duration: 100 });
    const bag = wk(1, [1, 2, 3].map((i) => set('heavy_bag_rounds', { durationS: 180, setIndex: i })));
    expect(sessionBests(bag, 'heavy_bag_rounds')).toEqual({ rounds: 3 }); // fixed-length rounds: no duration record
  });

  test('rekor, ona ilk ulaşan antrenmanda kalır; reddedilen antrenmanlar sayılmaz', () => {
    const w1 = wk(10, [bench(80, 5)]);
    const w2 = wk(5, [bench(80, 5)]); // ties: does not steal
    const w3 = wk(2, [bench(100, 5)], { sync: 'rejected' });
    const rec = computeRecords([w3, w2, w1]).get('bench_press')!;
    const weight = rec.find((r) => r.metric === 'weight')!;
    expect(weight).toMatchObject({ value: 80, workoutId: w1.id, at: w1.endedAt });
  });

  test('bir antrenmanın kırdığı rekorlar ve ilk ölçümler', () => {
    const w1 = wk(7, [bench(80, 5), set('plank', { durationS: 60 })]);
    const w2 = wk(3, [bench(85, 5), set('plank', { durationS: 50 }), set('push_up', { reps: 20 })]);
    const { records, firsts } = recordsSetBy(w2, [w1, w2]);
    expect(records.map((r) => [r.metric, r.previous, r.value]).sort()).toEqual(
      [
        ['e1rm', 93.3, 99.2],
        ['volume', 400, 425],
        ['weight', 80, 85],
      ].sort(),
    );
    expect(firsts).toEqual([{ exerciseKey: 'push_up', metric: 'reps', value: 20, previous: null }]);
    expect(recordCountsByWorkout([w1, w2])).toEqual(new Map([[w1.id, 0], [w2.id, 3]]));
    expect(formatRecord('e1rm', 92.5)).toBe('92,5 kg');
    expect(formatRecord('duration', 90)).toBe('1:30 dk');
    expect(formatRecord('pace', 295)).toBe('4:55 /km');
  });
});

test.describe('İstatistik, XP ve seri', () => {
  test('antrenman istatistiği: ısınma hacme girmez; raund ve mesafe sayılır', () => {
    const w = wk(1, [bench(100, 2, 'warmup'), bench(60, 10), set('heavy_bag_rounds', { durationS: 180 }), set('easy_run', { distanceM: 5000, durationS: 1500 })]);
    expect(workoutStats(w)).toMatchObject({ minutes: 50, sets: 4, reps: 12, volumeKg: 600, exercises: 3, rounds: 1, distanceM: 5000 });
  });

  test('XP formülü ve seviyeler', () => {
    const w = wk(1, [bench(60, 10), bench(60, 10)]); // 50 min
    expect(workoutXp(w, 0)).toBe(50 + 2 * 2 + 10);
    expect(workoutXp(w, 2)).toBe(50 + 4 + 10 + 50);
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, span: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(399).level).toBe(2);
    expect(levelFor(400)).toMatchObject({ level: 3, into: 0, span: 500 });
  });

  test('seri: bugün ya da dünden geriye kesintisiz günler', () => {
    expect(streakDays([], NOW)).toBe(0);
    expect(streakDays([wk(1, [bench(1, 1)]), wk(2, [bench(1, 1)]), wk(4, [bench(1, 1)])], NOW)).toBe(2);
    expect(streakDays([wk(0, [bench(1, 1)]), wk(1, [bench(1, 1)])], NOW)).toBe(2);
    expect(streakDays([wk(2, [bench(1, 1)])], NOW), 'yesterday missing breaks it').toBe(0);
  });

  test('karşılaştırma: önce aynı program, sonra aynı ad, sonra aynı branş', () => {
    const tpl = '22222222-2222-4222-8222-222222222222';
    const sameSport = wk(3, [bench(1, 1)], { name: 'Başka' });
    const sameName = wk(6, [bench(1, 1)]);
    const sameTpl = wk(9, [bench(1, 1)], { name: 'Eski ad', templateId: tpl });
    const now = wk(0, [bench(1, 1)], { templateId: tpl });
    expect(previousComparable(now, [sameSport, sameName, sameTpl, now])?.id).toBe(sameTpl.id);
    expect(previousComparable({ ...now, templateId: null }, [sameSport, sameName, sameTpl])?.id).toBe(sameName.id);
    expect(previousComparable({ ...now, templateId: null, name: 'Yeni' }, [sameSport, sameName])?.id).toBe(sameSport.id);
    expect(previousComparable({ ...now, sport: 'swimming', name: 'Yeni', templateId: null }, [sameSport])).toBeNull();
  });
});

test.describe('Athlete Score (antrenman)', () => {
  const targets = { targetDays: 4, weeklyTargetMinutes: 200 };

  test(`${CALIBRATION_WORKOUTS} antrenmandan önce skor yok (kalibrasyon); reddedilenler sayılmaz`, () => {
    expect(computeTrainingScore([], targets, NOW)).toEqual({ status: 'calibrating', workouts: 0, needed: 3 });
    const two = [wk(1, [bench(60, 5)]), wk(2, [bench(60, 5)]), wk(3, [bench(60, 5)], { sync: 'rejected' })];
    expect(computeTrainingScore(two, targets, NOW)).toMatchObject({ status: 'calibrating', workouts: 2 });
  });

  test('bileşenler ve açıklamaları; 7 gün önce kalibre değilse değişim gösterilmez', () => {
    // Getting heavier each session: sessions 2 and 3 each beat 1RM, weight and volume.
    const h = [wk(3, [bench(60, 5)]), wk(2, [bench(62.5, 5)]), wk(1, [bench(65, 5)])];
    const s = computeTrainingScore(h, targets, NOW);
    if (s.status !== 'ready') throw new Error('expected ready');
    const by = Object.fromEntries(s.components.map((c) => [c.key, c]));
    expect(by.frequency).toMatchObject({ value: 75, detail: '3 / 4 gün · son 7 gün' });
    expect(by.volume).toMatchObject({ value: 75, detail: '150 / 200 dk · son 7 gün' });
    expect(by.consistency).toMatchObject({ value: 25, detail: '1 / 4 hafta düzenli (haftada 2+ antrenman)' });
    expect(by.progress.detail).toBe('6 kişisel rekor · son 4 hafta');
    expect(by.progress.value).toBe(100);
    expect(s.total).toBe(Math.round(75 * 0.3 + 75 * 0.3 + 25 * 0.25 + 100 * 0.15));
    expect(s.delta).toBeNull();
  });

  test('değişim: geçen haftaya göre fark', () => {
    const h = [8, 9, 10, 11, 1, 2].map((d) => wk(d, [bench(60, 5)]));
    const s = computeTrainingScore(h, targets, NOW);
    if (s.status !== 'ready') throw new Error('expected ready');
    expect(typeof s.delta).toBe('number');
  });
});

test.describe('Ana ekran verisi', () => {
  const profile = { userId: A, primarySport: 'fitness' as const, secondarySports: [], goals: ['strength' as const], age: 27, heightCm: 178, weightKg: 75, createdAt: '', updatedAt: '' };

  test('haftalık dakikalar, seri ve istatistikler gerçek antrenmanlardan; gelecek günler boş', () => {
    // NOW is Thursday: Mon = 3 days ago, Wed = yesterday.
    const h = [wk(3, [bench(60, 5)], { rpe: 7 }), wk(1, [bench(60, 5), bench(60, 5)], { rpe: 9 }), wk(9, [bench(60, 5)])];
    const s = buildDashboardSnapshot(profile, h, NOW);
    expect(s.week.map((d) => d.minutes)).toEqual([50, 0, 50, 0, 0, 0, 0]);
    expect(s.week.map((d) => d.isFuture)).toEqual([false, false, false, false, true, true, true]);
    expect(s.streakDays).toBe(1);
    expect(s.stats).toEqual({ sessions: 2, minutes: 100, sets: 3, avgRpe: 8 });
    expect(s.empty).toBe(false);
    expect(s.score.status).toBe('ready');
  });

  test('yeni kullanıcı: hiçbir uydurma değer yok; beslenmede yalnızca hedefler', () => {
    const s = buildDashboardSnapshot(profile, [], NOW);
    expect(s.week.every((d) => d.minutes === 0)).toBe(true);
    expect(s.stats).toEqual({ sessions: 0, minutes: 0, sets: 0, avgRpe: null });
    expect(s.score).toEqual({ status: 'calibrating', workouts: 0, needed: 3 });
    expect(s.empty).toBe(true);
    expect(Object.keys(s.nutrition).sort()).toEqual(['kcalTarget', 'macros']);
    expect(s).not.toHaveProperty('recovery');
    expect(s.nutrition.macros.every((m) => Object.keys(m).sort().join() === 'key,label,target')).toBe(true);
  });
});
