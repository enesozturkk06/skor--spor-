/**
 * Exercise library integrity (catalog v1). Pure data checks, no browser.
 * Keys end up in workout_sets.exercise_key (planned check: ^[a-z0-9_]{2,64}$),
 * so they must be valid, unique and stable.
 */
import { expect, test } from '@playwright/test';

import { SPORTS } from '../../src/features/athlete/catalog';
import { EXERCISES, filterExercises, getExercise, normalize, relatedExercises } from '../../src/features/exercises/catalog';
import { BACK, FRONT, sidesOf } from '../../src/features/exercises/components/body-paths';
import { MUSCLE_IDS, MUSCLES } from '../../src/features/exercises/muscles';
import { recommendedPrescription } from '../../src/features/exercises/recommend';

const KEY_RE = /^[a-z0-9_]{2,64}$/;
const sportIds = SPORTS.map((s) => s.id) as string[];

test.describe('Egzersiz kataloğu', () => {
  test('yaklaşık 60 egzersiz, benzersiz ve veritabanına uygun anahtarlar', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(55);
    expect(EXERCISES.length).toBeLessThanOrEqual(70);
    const keys = EXERCISES.map((e) => e.key);
    expect(new Set(keys).size, 'duplicate keys').toBe(keys.length);
    for (const k of keys) expect(k, k).toMatch(KEY_RE);
    expect(getExercise('bench_press')?.name.en).toBe('Barbell Bench Press');
    expect(getExercise('nope')).toBeUndefined();
  });

  test('her egzersizde TR/EN ad, kaslar, teknik, nefes, hatalar ve set önerisi var', () => {
    const trNames = new Set<string>();
    for (const e of EXERCISES) {
      const at = `[${e.key}]`;
      expect(e.name.tr.trim(), at).not.toBe('');
      expect(e.name.en.trim(), at).not.toBe('');
      expect(e.name.tr.length, at).toBeLessThanOrEqual(80); // workout_sets.exercise_name limit
      expect(trNames.has(e.name.tr), `${at} duplicate Turkish name`).toBe(false);
      trNames.add(e.name.tr);
      expect(e.primary.length, `${at} primary`).toBeGreaterThan(0);
      for (const m of [...e.primary, ...e.secondary]) expect(MUSCLE_IDS, `${at} ${m}`).toContain(m);
      expect(e.primary.filter((m) => e.secondary.includes(m)), `${at} primary ∩ secondary`).toEqual([]);
      expect(new Set(e.secondary).size, `${at} duplicate secondary`).toBe(e.secondary.length);
      expect(e.steps.length, `${at} steps`).toBeGreaterThanOrEqual(3);
      expect(e.mistakes.length, `${at} mistakes`).toBeGreaterThanOrEqual(2);
      expect(e.breathing.length, `${at} breathing`).toBeGreaterThan(20);
      expect(e.prescriptions.length, `${at} prescriptions`).toBeGreaterThan(0);
      expect(new Set(e.prescriptions.map((p) => p.goal)).size, `${at} duplicate goal`).toBe(e.prescriptions.length);
      expect(e.sports.length, `${at} sports`).toBeGreaterThan(0);
      for (const s of e.sports) expect(sportIds, `${at} ${s}`).toContain(s);
      expect(e.equipment.length, `${at} equipment`).toBeGreaterThan(0);
    }
  });

  test('her branş en az 3 egzersizle destekleniyor; dövüş, koşu ve yüzme kendi tekniğine sahip', () => {
    for (const s of sportIds) {
      expect(EXERCISES.filter((e) => e.sports.includes(s as never)).length, s).toBeGreaterThanOrEqual(3);
    }
    const only = (sport: string) => EXERCISES.filter((e) => e.sports.includes(sport as never) && e.category !== 'strength');
    expect(only('boxing').length).toBeGreaterThanOrEqual(6);
    expect(only('kickboxing').length).toBeGreaterThanOrEqual(6);
    expect(only('karate').length).toBeGreaterThanOrEqual(5);
    expect(only('running').length).toBeGreaterThanOrEqual(4);
    expect(only('swimming').length).toBeGreaterThanOrEqual(2);
  });

  test('her kas haritada çiziliyor ve en az bir egzersizde çalışıyor', () => {
    const drawn = new Set([...FRONT, ...BACK].map((r) => r.muscle));
    expect([...drawn].sort()).toEqual([...MUSCLE_IDS].sort());
    for (const m of MUSCLE_IDS) {
      expect(sidesOf(m).length, m).toBeGreaterThan(0);
      expect(EXERCISES.some((e) => e.primary.includes(m) || e.secondary.includes(m)), `${m} unused`).toBe(true);
    }
    expect(sidesOf('chest')).toEqual(['front']);
    expect(sidesOf('side_delts')).toEqual(['front', 'back']);
    expect(MUSCLES.lats.tr).toBe('Kanat (latissimus)');
  });
});

test.describe('Arama ve filtre', () => {
  test('Türkçe karakterden bağımsız arama, İngilizce ad ve kas adı', () => {
    expect(normalize('Şınav İP Atlama')).toBe('sinav ip atlama');
    expect(filterExercises({ query: 'sinav' }).map((e) => e.key)).toContain('push_up');
    expect(filterExercises({ query: 'Şınav' }).map((e) => e.key)).toContain('push_up');
    // Every word must match; whole-phrase name matches are listed first.
    expect(filterExercises({ query: 'pull-up' })[0].key).toBe('pull_up');
    expect(filterExercises({ query: 'bench' }).map((e) => e.key)).toEqual(['bench_press']);
    expect(filterExercises({ query: 'roundhouse' }).map((e) => e.key).sort()).toEqual(['mawashi_geri', 'roundhouse_kick']);
    // Muscle names (TR) are searchable too.
    expect(filterExercises({ query: 'baldır' }).every((e) => [...e.primary, ...e.secondary].includes('calves'))).toBe(true);
    expect(filterExercises({ query: 'zzzz' })).toEqual([]);
  });

  test('kas, kas grubu ve branş filtreleri birleşir; birincil kas önce gelir', () => {
    const chest = filterExercises({ muscle: 'chest' });
    expect(chest.length).toBeGreaterThan(3);
    const firstSecondary = chest.findIndex((e) => !e.primary.includes('chest'));
    if (firstSecondary !== -1) expect(chest.slice(firstSecondary).every((e) => !e.primary.includes('chest'))).toBe(true);

    const boxingLegs = filterExercises({ sport: 'boxing', group: 'legs' });
    expect(boxingLegs.length).toBeGreaterThan(0);
    for (const e of boxingLegs) {
      expect(e.sports).toContain('boxing');
      expect([...e.primary, ...e.secondary].some((m) => MUSCLES[m].group === 'legs')).toBe(true);
    }
    expect(filterExercises({ sport: 'swimming', query: 'serbest' }).map((e) => e.key)).toEqual(['freestyle_swim']);
  });

  test('benzer egzersizler aynı birincil kası paylaşır ve kendisini içermez', () => {
    const bench = getExercise('bench_press')!;
    const rel = relatedExercises(bench);
    expect(rel.length).toBeGreaterThan(0);
    for (const r of rel) {
      expect(r.key).not.toBe('bench_press');
      expect(r.primary.some((m) => bench.primary.includes(m))).toBe(true);
    }
  });

  test('set önerisi sporcunun hedef sırasına göre seçilir', () => {
    const bench = getExercise('bench_press')!; // strength, hypertrophy, endurance
    expect(recommendedPrescription(bench, ['muscle_gain'])).toEqual({ index: 1, matched: true });
    expect(recommendedPrescription(bench, ['strength', 'muscle_gain'])).toEqual({ index: 0, matched: true });
    expect(recommendedPrescription(bench, ['endurance'])).toEqual({ index: 2, matched: true });
    expect(recommendedPrescription(bench, [])).toEqual({ index: 0, matched: false });
    expect(recommendedPrescription(bench, ['mobility'])).toEqual({ index: 0, matched: false });
    const jab = getExercise('jab_cross')!; // technique, power, conditioning
    expect(recommendedPrescription(jab, ['competition']).index).toBe(2);
  });
});
