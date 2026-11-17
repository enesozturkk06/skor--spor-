/**
 * Phase 3C clock logic: rest, rounds and pause are derived from timestamps,
 * so they are exact after reloads and app kills. Pure functions, no browser.
 */
import { expect, test } from '@playwright/test';

import { countdownSeconds, elapsedMs, formatClock, restRemainingMs, roundState } from '../../src/features/training/timers';
import type { ActiveWorkout, RoundTimer } from '../../src/features/training/types';
import {
  addExercise,
  adjustRest,
  completeSet,
  createActiveWorkout,
  expireRest,
  finalizeWorkout,
  pauseWorkout,
  resumeWorkout,
  sanitizeActive,
  skipRest,
  startRounds,
  stopRounds,
  syncRounds,
  uncompleteSet,
  updateSet,
} from '../../src/features/training/workout-model';

const A = '11111111-1111-4111-8111-111111111111';
const T0 = Date.parse('2026-11-01T18:00:00Z');
const at = (s: number) => T0 + s * 1000;

function bench(): ActiveWorkout {
  const w = addExercise(createActiveWorkout({ userId: A, name: 'Push', sport: 'fitness', now: new Date(T0) }), 'bench_press');
  return updateSet(w, w.exercises[0].uid, w.exercises[0].sets[0].uid, { reps: 8, weightKg: 60 });
}
const ids = (w: ActiveWorkout) => ({ ex: w.exercises[0].uid, set: w.exercises[0].sets[0].uid });

test.describe('Dinlenme', () => {
  test('set tamamlanınca egzersizin dinlenmesi başlar; değersiz set tamamlanamaz', () => {
    const w = bench();
    const { ex, set } = ids(w);
    const done = completeSet(w, ex, set, at(60));
    expect(done.rest).toMatchObject({ exUid: ex, setUid: set, durationS: 90 });
    expect(restRemainingMs(done, at(60))).toBe(90_000);
    expect(restRemainingMs(done, at(120))).toBe(30_000);
    expect(restRemainingMs(done, at(500))).toBe(0);
    expect(expireRest(done, at(149)).rest).not.toBeNull();
    expect(expireRest(done, at(150)).rest).toBeNull();
    expect(uncompleteSet(done, ex, set).rest, 'undo cancels its rest').toBeNull();
    expect(skipRest(done).rest).toBeNull();

    const empty = addExercise(createActiveWorkout({ userId: A, name: 'x', sport: 'fitness', now: new Date(T0) }), 'bench_press');
    expect(() => completeSet(empty, empty.exercises[0].uid, empty.exercises[0].sets[0].uid, at(1))).toThrow('Önce bir değer gir.');
    // …unless last session's values are passed as the fill.
    const filled = completeSet(empty, empty.exercises[0].uid, empty.exercises[0].sets[0].uid, at(1), { reps: 5, weightKg: 70 });
    expect(filled.exercises[0].sets[0]).toMatchObject({ reps: 5, weightKg: 70, done: true });
  });

  test('±15 sn: sınırlar içinde kalır, egzersiz için hatırlanır; sıfırın altına inerse biter', () => {
    const b = bench();
    const w = completeSet(b, ids(b).ex, ids(b).set, at(0));
    const plus = adjustRest(w, 15, at(10));
    expect(plus.rest?.durationS).toBe(105);
    expect(plus.exercises[0].restS).toBe(105);
    let short = w;
    for (let i = 0; i < 10; i++) short = adjustRest(short, -15, at(1));
    expect(short.rest?.durationS).toBe(15); // floor
    expect(adjustRest(w, -15, at(80)).rest, 'already past the new end').toBeNull();
    let long = w;
    for (let i = 0; i < 60; i++) long = adjustRest(long, 15, at(1));
    expect(long.rest?.durationS).toBe(600);
  });
});

test.describe('Duraklatma', () => {
  test('duraklatınca süre ve dinlenme donar; devamda kaldığı yerden sürer', () => {
    const w0 = bench();
    const { ex, set } = ids(w0);
    let w = completeSet(w0, ex, set, at(100)); // rest until 190
    w = pauseWorkout(w, at(130)); // 60 s rest left
    expect(elapsedMs(w, at(1000))).toBe(130_000);
    expect(restRemainingMs(w, at(1000))).toBe(60_000);
    w = resumeWorkout(w, at(400)); // paused 270 s
    expect(w.pausedMs).toBe(270_000);
    expect(restRemainingMs(w, at(400))).toBe(60_000);
    expect(elapsedMs(w, at(430))).toBe(160_000);
    expect(pauseWorkout(pauseWorkout(w, at(500)), at(600)).pausedAt, 'second pause keeps the first moment').toBe(new Date(at(500)).toISOString());

    // The saved duration excludes pauses.
    const done = finalizeWorkout(w, { now: new Date(at(1000)) });
    expect(Date.parse(done.endedAt) - Date.parse(done.startedAt)).toBe(730_000);
    // Finished while paused: ends at the pause.
    const whilePaused = finalizeWorkout(pauseWorkout(w, at(700)), { now: new Date(at(5000)) });
    expect(Date.parse(whilePaused.endedAt) - T0).toBe(430_000);
  });
});

test.describe('Raund zamanlayıcısı', () => {
  const t: RoundTimer = { exUid: 'x', startedAt: new Date(T0).toISOString(), rounds: 3, roundS: 180, restS: 60, prepS: 10 };

  test('evreler: hazırlık → raund → dinlenme → … → bitti (son raunddan sonra dinlenme yok)', () => {
    expect(roundState(t, at(0))).toMatchObject({ phase: 'prep', round: 1, remainingMs: 10_000, completedRounds: 0 });
    expect(roundState(t, at(10))).toMatchObject({ phase: 'round', round: 1, remainingMs: 180_000, completedRounds: 0 });
    expect(roundState(t, at(189))).toMatchObject({ phase: 'round', round: 1, remainingMs: 1_000 });
    expect(roundState(t, at(190))).toMatchObject({ phase: 'rest', round: 1, remainingMs: 60_000, completedRounds: 1 });
    expect(roundState(t, at(250))).toMatchObject({ phase: 'round', round: 2, completedRounds: 1 });
    expect(roundState(t, at(10 + 3 * 180 + 2 * 60 - 1))).toMatchObject({ phase: 'round', round: 3, remainingMs: 1_000 });
    expect(roundState(t, at(10 + 3 * 180 + 2 * 60))).toMatchObject({ phase: 'done', completedRounds: 3 });
    expect(roundState(t, at(99_999))).toMatchObject({ phase: 'done', completedRounds: 3 });
  });

  test('biten her raund bir kez set olarak yazılır; kapalıyken biten raundlar da işlenir', () => {
    let w = addExercise(createActiveWorkout({ userId: A, name: 'Boks', sport: 'boxing', now: new Date(T0) }), 'heavy_bag_rounds');
    const ex = w.exercises[0].uid;
    w = startRounds(w, ex, { rounds: 3, roundS: 180, restS: 60 }, T0);
    expect(syncRounds(w, at(100)), 'nothing finished: same object, no write').toBe(w);
    const r1 = syncRounds(w, at(200));
    expect(r1.exercises[0].sets.map((s) => [s.done, s.durationS])).toEqual([[true, 180]]); // reused the empty set
    expect(syncRounds(r1, at(205))).toBe(r1);
    // App closed for 20 minutes: the rest is logged on return and the clock ends.
    const back = syncRounds(r1, at(1200));
    expect(back.exercises[0].sets.filter((s) => s.done)).toHaveLength(3);
    expect(back.roundTimer).toBeNull();
    expect(back.exercises[0].sets[2].completedAt).toBe(new Date(at(10 + 3 * 180 + 2 * 60)).toISOString());
    // Stopped early: finished rounds kept, clock gone.
    const stopped = stopRounds(w, at(300));
    expect(stopped.roundTimer).toBeNull();
    expect(stopped.exercises[0].sets.filter((s) => s.done)).toHaveLength(1);
    expect(startRounds(w, ex, { rounds: 99, roundS: 1, restS: 999 }, T0).roundTimer).toMatchObject({ rounds: 12, roundS: 60, restS: 120 });
  });

  test('duraklatma raund saatini de dondurur', () => {
    let w = addExercise(createActiveWorkout({ userId: A, name: 'Boks', sport: 'boxing', now: new Date(T0) }), 'heavy_bag_rounds');
    w = startRounds(w, w.exercises[0].uid, { rounds: 2, roundS: 120, restS: 60 }, T0);
    w = pauseWorkout(w, at(70)); // 60 s into round 1
    w = resumeWorkout(w, at(1000));
    expect(roundState(w.roundTimer!, at(1000))).toMatchObject({ phase: 'round', round: 1, remainingMs: 60_000 });
    expect(syncRounds(w, at(1000)).exercises[0].sets.some((s) => s.done)).toBe(false);
  });
});

test.describe('Taslak saklama ve biçim', () => {
  test('zamanlayıcılar kayıttan geri okunur; bozuk zamanlayıcı atılır, eski taslak çalışır', () => {
    let w = bench();
    const { ex, set } = ids(w);
    w = pauseWorkout(completeSet(w, ex, set, at(5)), at(9));
    const back = sanitizeActive(JSON.parse(JSON.stringify(w)), A)!;
    expect(back.rest).toEqual(w.rest);
    expect(back.pausedAt).toBe(w.pausedAt);
    expect(sanitizeActive({ ...w, rest: { ...w.rest, exUid: 'gone' } }, A)?.rest).toBeNull();
    expect(sanitizeActive({ ...w, roundTimer: { exUid: ex, startedAt: 'x', rounds: 3, roundS: 180, restS: 60, prepS: 10 } }, A)?.roundTimer).toBeNull();
    // A Phase 3B draft (no timer fields) still loads.
    const legacy = JSON.parse(JSON.stringify(bench())) as Record<string, unknown>;
    for (const k of ['pausedAt', 'pausedMs', 'rest', 'roundTimer']) delete legacy[k];
    delete (legacy.exercises as Record<string, unknown>[])[0].restS;
    expect(sanitizeActive(legacy, A)).toMatchObject({ pausedAt: null, pausedMs: 0, rest: null, roundTimer: null, exercises: [{ restS: 90 }] });
  });

  test('saat biçimi', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(countdownSeconds(89_001)).toBe(90);
    expect(countdownSeconds(0)).toBe(0);
  });
});
