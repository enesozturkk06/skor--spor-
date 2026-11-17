/**
 * Phase 3D program (template) logic: built-in programs, validation,
 * conversion to database rows, and starting a workout from a program.
 */
import { expect, test } from '@playwright/test';

import { getExercise } from '../../src/features/exercises/catalog';
import { BUILTIN_TEMPLATES, getBuiltinTemplate } from '../../src/features/training/builtin-templates';
import { summarizeBlock } from '../../src/features/training/programs/format';
import {
  activeFromTemplate,
  blankTemplate,
  duplicateTemplate,
  estimateMinutes,
  fromTemplateRow,
  isoWeekday,
  move,
  newBlock,
  nextKind,
  sanitizeTemplate,
  toTemplateRow,
  totalSets,
  validateTemplate,
} from '../../src/features/training/template-model';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const noUid = <T extends { blocks: { uid: string }[] }>(t: T) => ({ ...t, blocks: t.blocks.map(({ uid: _uid, ...b }) => b) });

test.describe('Hazır şablonlar', () => {
  test('hepsi geçerli, benzersiz, katalogdaki egzersizlerle ve doğru ölçüm tipiyle', () => {
    expect(BUILTIN_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(new Set(BUILTIN_TEMPLATES.map((t) => t.id)).size).toBe(BUILTIN_TEMPLATES.length);
    for (const t of BUILTIN_TEMPLATES) {
      expect(validateTemplate(t), t.id).toBeNull();
      expect(t.builtIn && t.userId === null && t.days.length === 0, t.id).toBe(true);
      for (const b of t.blocks) {
        const ex = getExercise(b.exerciseKey);
        expect(ex, `${t.id}: ${b.exerciseKey}`).toBeTruthy();
        // Round-type exercises use a round plan (or sets with a duration), never reps-only.
        if (ex!.modality === 'rounds' && !b.rounds) expect(b.sets.every((s) => s.durationS !== null), `${t.id}: ${b.exerciseKey}`).toBe(true);
      }
      // A customised copy survives the database round trip unchanged.
      const copy = duplicateTemplate(t, A);
      expect(noUid(fromTemplateRow({ ...toTemplateRow(copy), updated_at: copy.updatedAt }, A)!)).toEqual(noUid(copy));
    }
    const sports = new Set(BUILTIN_TEMPLATES.map((t) => t.sport));
    for (const s of ['fitness', 'bodybuilding', 'boxing', 'kickboxing', 'karate', 'running']) expect(sports.has(s as never), s).toBe(true);
    expect(getBuiltinTemplate('builtin-boxing-bag')!.blocks.find((b) => b.exerciseKey === 'heavy_bag_rounds')!.rounds).toEqual({ rounds: 6, roundS: 180, restS: 60 });
  });
});

test.describe('Program modeli', () => {
  test('kopyalama: yeni kimlik, sahip, ad; hazır şablonun günleri kopyalanmaz', () => {
    const builtin = getBuiltinTemplate('builtin-push')!;
    const mine = duplicateTemplate(builtin, A);
    expect(mine).toMatchObject({ userId: A, builtIn: false, name: builtin.name, days: [] });
    expect(mine.id).not.toBe(builtin.id);
    expect(mine.blocks[0].uid).not.toBe(builtin.blocks[0].uid);
    const again = duplicateTemplate({ ...mine, days: [1, 4] }, A);
    expect(again.name).toBe(`${builtin.name} (kopya)`);
    expect(again.days).toEqual([1, 4]);
  });

  test('doğrulama mesajları ve yeni blok varsayılanları', () => {
    const t = blankTemplate({ userId: A, sport: 'fitness' });
    expect(validateTemplate(t)).toBe('Programa bir ad ver.');
    expect(validateTemplate({ ...t, name: 'X' })).toBe('En az bir egzersiz ekle.');
    const bench = newBlock('bench_press');
    expect(bench).toMatchObject({ restS: 90, rounds: null, sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] });
    expect(validateTemplate({ ...t, name: 'X', blocks: [{ ...bench, sets: [] }] })).toBe('Düz Bench Press: en az bir set ekle.');
    expect(validateTemplate({ ...t, name: 'X', blocks: [{ ...bench, sets: [{ ...bench.sets[0], reps: null }] }] })).toContain('tekrar, süre ya da mesafe');
    expect(newBlock('heavy_bag_rounds')).toMatchObject({ rounds: { rounds: 3, roundS: 180, restS: 60 }, sets: [] });
    expect(newBlock('plank').sets[0].durationS).toBe(45);
    expect(['normal', 'warmup', 'drop', 'failure'].map((k) => nextKind(k as never))).toEqual(['warmup', 'drop', 'failure', 'normal']);
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(move(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a']);
  });

  test('kayıt doğrulama: yabancı program, geçersiz gün ve bilinmeyen egzersiz', () => {
    const t = { ...duplicateTemplate(getBuiltinTemplate('builtin-legs')!, A), days: [1, 3] as (1 | 3)[] };
    expect(sanitizeTemplate(t, B), 'foreign').toBeNull();
    const odd = sanitizeTemplate({ ...t, days: [3, 9, 1, 3, 0], goal: 'bulk', blocks: [...t.blocks, { exerciseKey: 'nope', restS: 60, sets: [] }] }, A)!;
    expect(odd.days).toEqual([1, 3]);
    expect(odd.goal).toBeNull();
    expect(odd.blocks).toHaveLength(t.blocks.length);
    expect(sanitizeTemplate({ ...t, name: '   ' }, A)).toBeNull();
    // DB row: owner and snake_case blocks; timestamps are the server's.
    const row = toTemplateRow(t);
    expect(row).toMatchObject({ user_id: A, days: [1, 3], goal: 'strength' });
    expect(row).not.toHaveProperty('updated_at');
    expect(row.blocks[0]).toEqual(expect.objectContaining({ exercise_key: 'back_squat', rest_s: 180 }));
  });

  test('programdan antrenman: planlanan değerler hazır, setler tamamlanmamış, set türü ve raund planı korunur', () => {
    const push = getBuiltinTemplate('builtin-push')!;
    const w = activeFromTemplate(push, A, new Date('2026-11-01T10:00:00Z'));
    expect(w).toMatchObject({ userId: A, name: push.name, sport: 'fitness', templateId: null });
    expect(w.exercises.map((e) => e.exerciseKey)).toEqual(push.blocks.map((b) => b.exerciseKey));
    expect(w.exercises[0].sets.map((s) => [s.kind, s.reps, s.done])).toEqual([['warmup', 12, false], ...Array(4).fill(['normal', 8, false])]);
    expect(w.exercises[0].restS).toBe(120);

    const bag = activeFromTemplate(getBuiltinTemplate('builtin-boxing-bag')!, A);
    const rounds = bag.exercises.find((e) => e.exerciseKey === 'heavy_bag_rounds')!;
    expect(rounds.plannedRounds).toEqual({ rounds: 6, roundS: 180, restS: 60 });
    expect(rounds.sets).toHaveLength(6);
    expect(rounds.sets.every((s) => s.durationS === 180 && !s.done)).toBe(true);

    // The athlete's own program is linked by id (workouts.template_id).
    const mine = duplicateTemplate(push, A);
    expect(activeFromTemplate(mine, A).templateId).toBe(mine.id);
  });

  test('özet: süre tahmini, set sayısı, blok özeti ve gün', () => {
    const bag = getBuiltinTemplate('builtin-boxing-bag')!;
    expect(totalSets(bag)).toBe(2 + 2 + 6 + 3);
    expect(estimateMinutes(bag)).toBeGreaterThan(30);
    const push = getBuiltinTemplate('builtin-push')!;
    expect(summarizeBlock(push.blocks[0])).toBe('Ö 1 × 12 · 4 × 8');
    expect(summarizeBlock(push.blocks[4])).toBe('2 × 12 · D 1 × 12');
    expect(summarizeBlock(bag.blocks[2])).toBe('6 raund × 3:00 · dinlenme 1:00');
    expect(isoWeekday(new Date(2026, 10, 16))).toBe(1); // Monday
    expect(isoWeekday(new Date(2026, 10, 22))).toBe(7); // Sunday
  });
});
