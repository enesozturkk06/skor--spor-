/**
 * Pure workout logic (Phase 3B): building, finishing and defensive parsing.
 * Limits must match the planned database constraints.
 */
import { expect, test } from '@playwright/test';

import type { ActiveWorkout } from '../../src/features/training/types';
import {
  addExercise,
  addSet,
  createActiveWorkout,
  doneSetCount,
  finalizeWorkout,
  removeSet,
  sanitizeActive,
  sanitizeWorkout,
  setDone,
  toSavePayload,
  updateSet,
  WorkoutError,
} from '../../src/features/training/workout-model';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const T0 = new Date('2026-11-01T18:00:00Z');

/** Bench (2 done sets, 1 undone) + plank (nothing done) + squat (1 done). */
function sample(): ActiveWorkout {
  let w = createActiveWorkout({ userId: A, name: '  Push Day  ', sport: 'fitness', now: T0 });
  w = addExercise(w, 'bench_press');
  w = addExercise(w, 'plank');
  w = addExercise(w, 'back_squat');
  const [bench, , squat] = w.exercises;
  w = updateSet(w, bench.uid, bench.sets[0].uid, { reps: 8, weightKg: 60.004 });
  w = setDone(w, bench.uid, bench.sets[0].uid, true, new Date('2026-11-01T18:05:00Z'));
  w = addSet(w, bench.uid);
  const b2 = w.exercises[0].sets[1];
  w = setDone(w, bench.uid, b2.uid, true);
  w = addSet(w, bench.uid); // left undone
  w = updateSet(w, squat.uid, squat.sets[0].uid, { reps: 5, weightKg: 100 });
  w = setDone(w, squat.uid, squat.sets[0].uid, true);
  return w;
}

test.describe('Antrenman modeli', () => {
  test('yeni set öncekinin değerleriyle gelir; değerler sınırlara çekilir', () => {
    const w = sample();
    const bench = w.exercises[0];
    expect(bench.sets[1]).toMatchObject({ reps: 8, weightKg: 60, done: true });
    expect(bench.sets[0].weightKg).toBe(60); // numeric(6,2) rounding
    expect(w.name).toBe('Push Day');
    const bad = updateSet(w, bench.uid, bench.sets[2].uid, { reps: -3, weightKg: 5000, durationS: Number.NaN });
    expect(bad.exercises[0].sets[2]).toMatchObject({ reps: null, weightKg: null, durationS: null });
    expect(doneSetCount(w)).toBe(3);
    expect(removeSet(w, bench.uid, bench.sets[0].uid).exercises[0].sets).toHaveLength(2);
    expect(() => addExercise(w, 'not_a_real_exercise')).toThrow(WorkoutError);
  });

  test('bitirme: yalnızca tamamlanan setler kalır, sıra numaraları yeniden verilir', () => {
    const done = finalizeWorkout(sample(), { now: new Date('2026-11-01T19:00:00Z'), rpe: 8, notes: '  iyi  ' });
    expect(done.sets.map((s) => [s.exerciseKey, s.position, s.setIndex])).toEqual([
      ['bench_press', 1, 1],
      ['bench_press', 1, 2],
      ['back_squat', 2, 1], // plank had nothing done → squat becomes #2
    ]);
    expect(done).toMatchObject({ userId: A, rpe: 8, notes: 'iyi', endedAt: '2026-11-01T19:00:00.000Z' });
    expect(done.sets[0].exerciseName).toBe('Düz Bench Press');
  });

  test('12 saatten uzun açık kalan antrenman 12 saatle sınırlanır; boş antrenman bitirilemez', () => {
    const w = sample();
    const late = finalizeWorkout(w, { now: new Date('2026-11-03T09:00:00Z') });
    expect(Date.parse(late.endedAt) - Date.parse(late.startedAt)).toBe(12 * 3600_000);
    const empty = createActiveWorkout({ userId: A, name: 'x', sport: 'boxing', now: T0 });
    expect(() => finalizeWorkout(addExercise(empty, 'jab_cross'))).toThrow('en az bir seti tamamla');
    expect(finalizeWorkout(w, { rpe: 11 }).rpe).toBeNull();
  });

  test('sunucuya giden kayıt kullanıcı kimliği taşımaz (sunucu oturumdan alır)', () => {
    const payload = toSavePayload(finalizeWorkout(sample(), { now: new Date('2026-11-01T19:00:00Z') }));
    expect(payload).not.toHaveProperty('user_id');
    expect(JSON.stringify(payload)).not.toContain(A);
    expect(payload.sets[0]).toEqual(
      expect.objectContaining({ exercise_key: 'bench_press', position: 1, set_index: 1, reps: 8, weight_kg: 60, kind: 'normal' }),
    );
  });

  test('saklanan antrenman: başka kullanıcınınki ve bozuk veri reddedilir', () => {
    const w = finalizeWorkout(sample(), { now: new Date('2026-11-01T19:00:00Z') });
    expect(sanitizeWorkout(w, A)).toEqual(w);
    expect(sanitizeWorkout(w, B), 'foreign workout').toBeNull();
    expect(sanitizeWorkout({ ...w, id: 'not-a-uuid' }, A)).toBeNull();
    expect(sanitizeWorkout({ ...w, sport: 'chess' }, A)).toBeNull();
    expect(sanitizeWorkout({ ...w, endedAt: '2026-11-01T17:00:00Z' }, A)).toBeNull();
    expect(sanitizeWorkout({ ...w, sets: [] }, A)).toBeNull();
    expect(sanitizeWorkout({ ...w, sets: [w.sets[0], w.sets[0]] }, A), 'duplicate position/set_index').toBeNull();
    expect(sanitizeWorkout({ ...w, sets: [{ ...w.sets[0], exerciseKey: 'DROP TABLE' }] }, A)).toBeNull();
    // A set without any measurement is dropped (database: reps or duration or distance).
    const partial = sanitizeWorkout({ ...w, sets: [w.sets[0], { ...w.sets[1], reps: null }] }, A);
    expect(partial?.sets).toHaveLength(1);
    expect(sanitizeWorkout(null, A)).toBeNull();
    expect(sanitizeWorkout('{"id":1}', A)).toBeNull();
  });

  test('aktif antrenman taslağı: yabancı, bozuk ya da gelecekteki taslak atılır', () => {
    const w = sample();
    const roundTrip = sanitizeActive(JSON.parse(JSON.stringify(w)), A);
    expect(roundTrip).toEqual(w);
    expect(sanitizeActive(w, B)).toBeNull();
    expect(sanitizeActive({ ...w, v: 2 }, A)).toBeNull();
    expect(sanitizeActive({ ...w, startedAt: '2099-01-01T00:00:00Z' }, A)).toBeNull();
    expect(sanitizeActive({ ...w, exercises: 'oops' }, A)?.exercises).toEqual([]);
    const junk = sanitizeActive({ ...w, exercises: [...w.exercises, { uid: 'x', exerciseKey: 'Bad Key', sets: [] }, null] }, A);
    expect(junk?.exercises).toHaveLength(3);
    expect(sanitizeActive(undefined, A)).toBeNull();
  });
});
