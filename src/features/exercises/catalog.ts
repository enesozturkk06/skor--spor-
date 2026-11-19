import type { IconName } from '@/components/ui';
import type { SportId } from '@/features/athlete/catalog';

import { ATHLETIC } from './data/athletic';
import { COMBAT } from './data/combat';
import { STRENGTH } from './data/strength';
import { MUSCLES, type MuscleGroupId, type MuscleId } from './muscles';
import type { Equipment, Exercise, ExerciseCategory, Level, Modality } from './types';

/**
 * The exercise library (catalog v1). Shipped with the app: works offline,
 * no table or query needed. Workouts store `exercise_key` plus a name
 * snapshot, so keys must never be renamed or reused.
 */
export const CATALOG_VERSION = 1;

export const EXERCISES: readonly Exercise[] = [...STRENGTH, ...COMBAT, ...ATHLETIC];

const byKey = new Map(EXERCISES.map((e) => [e.key, e]));

export const getExercise = (key: string): Exercise | undefined => byKey.get(key);

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Kuvvet',
  conditioning: 'Kondisyon',
  combat: 'Dövüş',
  endurance: 'Dayanıklılık',
  athletic: 'Atletik',
  mobility: 'Mobilite',
};

export const MODALITY_META: Record<Modality, { label: string; icon: IconName }> = {
  strength: { label: 'Tekrar × ağırlık', icon: 'dumbbell' },
  time: { label: 'Süre', icon: 'timer-outline' },
  cardio: { label: 'Mesafe & süre', icon: 'map-marker-distance' },
  rounds: { label: 'Raund', icon: 'boxing-glove' },
  skill: { label: 'Teknik', icon: 'whistle-outline' },
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Halter',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  machine: 'Makine',
  cable: 'Kablo',
  bench: 'Sehpa',
  pullup_bar: 'Barfiks barı',
  bodyweight: 'Vücut ağırlığı',
  heavy_bag: 'Kum torbası',
  jump_rope: 'Atlama ipi',
  box: 'Plyo kutusu',
  medicine_ball: 'Sağlık topu',
  pool: 'Havuz',
  kickboard: 'Yüzme tahtası',
  track: 'Pist / parkur',
};

/* ------------------------------------------------------------------ */
/* Search & filter (pure, unit-tested)                                 */
/* ------------------------------------------------------------------ */

/** Lowercase, Turkish-aware, accent-free: "Şınav" and "sinav" both match. */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const haystack = new Map(
  EXERCISES.map((e) => [
    e.key,
    normalize([e.name.tr, e.name.en, e.key, ...[...e.primary, ...e.secondary].map((m) => `${MUSCLES[m].tr} ${MUSCLES[m].en}`)].join(' ')),
  ]),
);

const names = new Map(EXERCISES.map((e) => [e.key, normalize(`${e.name.tr} ${e.name.en}`)]));

export type ExerciseFilter = {
  query?: string;
  sport?: SportId | null;
  muscle?: MuscleId | null;
  group?: MuscleGroupId | null;
};

/** Does the exercise train this muscle (primary or secondary)? */
export const trains = (e: Exercise, m: MuscleId) => e.primary.includes(m) || e.secondary.includes(m);

export function filterExercises({ query, sport, muscle, group }: ExerciseFilter, list: readonly Exercise[] = EXERCISES): Exercise[] {
  const words = query ? normalize(query).split(' ').filter(Boolean) : [];
  const out = list.filter((e) => {
    if (sport && !e.sports.includes(sport)) return false;
    if (muscle && !trains(e, muscle)) return false;
    if (group && ![...e.primary, ...e.secondary].some((m) => MUSCLES[m].group === group)) return false;
    if (words.length) {
      const h = haystack.get(e.key)!;
      if (!words.every((w) => h.includes(w))) return false;
    }
    return true;
  });
  // Primary hits first when filtering by muscle; then whole-phrase name matches.
  // Array.sort is stable, so ties keep catalog order.
  if (muscle) out.sort((a, b) => Number(b.primary.includes(muscle)) - Number(a.primary.includes(muscle)));
  if (words.length) {
    const phrase = words.join(' ');
    const nameHit = (e: Exercise) => Number(names.get(e.key)!.includes(phrase));
    out.sort((a, b) => nameHit(b) - nameHit(a));
  }
  return out;
}

/** Exercises sharing a primary muscle, most overlap first. */
export function relatedExercises(e: Exercise, limit = 6): Exercise[] {
  return EXERCISES.filter((o) => o.key !== e.key)
    .map((o) => ({ o, score: o.primary.filter((m) => e.primary.includes(m)).length * 2 + o.sports.filter((s) => e.sports.includes(s)).length * 0.1 }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.o);
}
