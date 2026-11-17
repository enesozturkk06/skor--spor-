import type { SportId } from '@/features/athlete/catalog';

import { blankSet } from './template-model';
import type { RoundPlan, SetKind, TemplateBlock, TemplateGoal, TemplateSet, WorkoutTemplate } from './types';

/**
 * Ready-made programs shipped with the app (read-only). Starting one never
 * links a template id; customising makes the athlete's own copy.
 * Ids are stable ("builtin-…") and never stored in workout_templates.
 */
type Spec = [key: string, restS: number, sets: TemplateSet[] | RoundPlan];

const reps = (n: number, count: number, kind: SetKind = 'normal', kg: number | null = null): TemplateSet[] =>
  Array.from({ length: count }, () => ({ ...blankSet(kind), reps: n, weightKg: kg }));
const secs = (s: number, count: number): TemplateSet[] => Array.from({ length: count }, () => ({ ...blankSet(), durationS: s }));
const warm = (n: number): TemplateSet[] => reps(n, 1, 'warmup');
const run = (km: number, min: number): TemplateSet[] => [{ ...blankSet(), distanceM: km * 1000, durationS: min * 60 }];

function program(id: string, name: string, sport: SportId, goal: TemplateGoal, notes: string, specs: Spec[]): WorkoutTemplate {
  const blocks: TemplateBlock[] = specs.map(([exerciseKey, restS, sets], i) => ({
    uid: `${id}-${i}`,
    exerciseKey,
    restS,
    sets: Array.isArray(sets) ? sets : [],
    rounds: Array.isArray(sets) ? null : sets,
  }));
  return { id: `builtin-${id}`, userId: null, builtIn: true, name, sport, goal, notes, days: [], blocks, updatedAt: '2026-11-01T00:00:00.000Z' };
}

export const BUILTIN_TEMPLATES: readonly WorkoutTemplate[] = [
  program('push', 'Push: göğüs, omuz, triceps', 'fitness', 'hypertrophy', 'Klasik itiş günü. Ağır başla, izolasyonla bitir.', [
    ['bench_press', 120, [...warm(12), ...reps(8, 4)]],
    ['incline_dumbbell_press', 90, reps(10, 3)],
    ['overhead_press', 120, reps(8, 3)],
    ['lateral_raise', 60, reps(15, 3)],
    ['triceps_pushdown', 60, [...reps(12, 2), ...reps(12, 1, 'drop')]],
  ]),
  program('pull', 'Pull: sırt ve biceps', 'fitness', 'hypertrophy', 'Sırt genişliği ve kalınlığı; arka omuz sağlığı.', [
    ['pull_up', 120, reps(6, 4)],
    ['barbell_row', 120, reps(8, 4)],
    ['lat_pulldown', 90, reps(10, 3)],
    ['face_pull', 60, reps(15, 3)],
    ['hammer_curl', 60, reps(12, 3)],
  ]),
  program('legs', 'Bacak günü', 'bodybuilding', 'strength', 'Squat ağırlıklı alt vücut; arka zincir dengesiyle.', [
    ['back_squat', 180, [...warm(10), ...reps(5, 5)]],
    ['romanian_deadlift', 120, reps(8, 3)],
    ['bulgarian_split_squat', 90, reps(10, 3)],
    ['leg_curl', 60, reps(12, 3)],
    ['standing_calf_raise', 60, [...reps(15, 2), ...reps(15, 1, 'failure')]],
  ]),
  program('full-body', 'Tüm vücut · başlangıç', 'fitness', 'strength', 'Haftada 2–3 kez; temel hareketlerle güç temeli.', [
    ['back_squat', 120, reps(8, 3)],
    ['push_up', 90, reps(10, 3)],
    ['dumbbell_row', 90, reps(10, 3)],
    ['hip_thrust', 90, reps(10, 3)],
    ['plank', 60, secs(45, 3)],
  ]),
  program('boxing-bag', 'Boks: 6 raund torba', 'boxing', 'conditioning', 'Profesyonel raund yapısı: ısın, 6 × 3 dk torba, core ile bitir.', [
    ['jump_rope', 60, { rounds: 2, roundS: 180, restS: 60 }],
    ['shadow_boxing', 60, { rounds: 2, roundS: 180, restS: 60 }],
    ['heavy_bag_rounds', 60, { rounds: 6, roundS: 180, restS: 60 }],
    ['plank', 45, secs(45, 3)],
  ]),
  program('boxing-technique', 'Boks: teknik ve savunma', 'boxing', 'technique', 'Temiz form: düz yumruklar, kroşe ve kafa hareketi.', [
    ['shadow_boxing', 60, { rounds: 3, roundS: 120, restS: 60 }],
    ['jab_cross', 60, { rounds: 3, roundS: 120, restS: 60 }],
    ['slip_roll', 60, { rounds: 3, roundS: 120, restS: 45 }],
    ['hook', 60, { rounds: 2, roundS: 120, restS: 60 }],
  ]),
  program('kickboxing-rounds', 'Kickboks: raund antrenmanı', 'kickboxing', 'conditioning', 'Tekme kombinasyonları ve diz vuruşlarıyla yüksek tempo.', [
    ['jump_rope', 60, { rounds: 2, roundS: 180, restS: 60 }],
    ['roundhouse_kick', 60, { rounds: 3, roundS: 120, restS: 60 }],
    ['low_kick', 60, { rounds: 2, roundS: 120, restS: 60 }],
    ['teep', 45, { rounds: 2, roundS: 60, restS: 30 }],
    ['knee_strike', 45, { rounds: 2, roundS: 60, restS: 30 }],
    ['sprawl', 60, { rounds: 3, roundS: 60, restS: 30 }],
  ]),
  program('karate-kihon', 'Karate: kihon ve kata', 'karate', 'technique', 'Duruş gücü, temel teknikler ve kata tekrarları.', [
    ['kiba_dachi_hold', 60, secs(60, 3)],
    ['gyaku_zuki', 45, reps(15, 3)],
    ['mae_geri', 45, reps(10, 3)],
    ['mawashi_geri', 60, reps(8, 3)],
    ['kata_practice', 90, reps(3, 2)],
  ]),
  program('running-intervals', 'Koşu: 400 m interval', 'running', 'endurance', 'VO₂max geliştiren klasik interval seansı.', [
    ['easy_run', 60, run(2, 12)],
    ['interval_run', 90, Array.from({ length: 6 }, () => ({ ...blankSet(), distanceM: 400, durationS: 105 }))],
    ['easy_run', 60, run(1, 7)],
  ]),
  program('mobility', 'Mobilite · 15 dakika', 'fitness', 'mobility', 'Her antrenmandan önce ya da dinlenme gününde.', [
    ['worlds_greatest_stretch', 30, reps(6, 2)],
    ['hip_90_90', 30, reps(8, 2)],
    ['dead_bug', 45, reps(10, 2)],
    ['plank', 45, secs(40, 2)],
  ]),
];

export const getBuiltinTemplate = (id: string) => BUILTIN_TEMPLATES.find((t) => t.id === id);
