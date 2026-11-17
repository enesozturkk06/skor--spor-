import type { Modality } from '@/features/exercises/types';
import type { NumericSpec } from '@/lib/numeric-input';

import type { DraftSet } from '../types';
import type { SetPatch } from '../workout-model';

/**
 * Which inputs a set row shows for each way of measuring an exercise, and
 * how display units map onto the stored values (seconds, metres, kg).
 */
export type SetField = {
  key: 'weightKg' | 'reps' | 'durationS' | 'distanceM';
  label: string;
  unit: string;
  spec: NumericSpec;
  /** Stored value → display number. */
  toDisplay: (v: number) => number;
  /** Display number → stored value. */
  toStored: (n: number) => number;
};

const ident = (n: number) => n;
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

const KG: SetField = { key: 'weightKg', label: 'Ağırlık', unit: 'kg', spec: { maxIntDigits: 4, maxDecimals: 2 }, toDisplay: ident, toStored: (n) => round(n, 2) };
const REPS: SetField = { key: 'reps', label: 'Tekrar', unit: 'tekrar', spec: { maxIntDigits: 4, maxDecimals: 0 }, toDisplay: ident, toStored: Math.round };
const SEC: SetField = { key: 'durationS', label: 'Süre', unit: 'sn', spec: { maxIntDigits: 5, maxDecimals: 0 }, toDisplay: ident, toStored: Math.round };
const MIN: SetField = { key: 'durationS', label: 'Süre', unit: 'dk', spec: { maxIntDigits: 3, maxDecimals: 1 }, toDisplay: (s) => round(s / 60, 1), toStored: (m) => Math.round(m * 60) };
const KM: SetField = { key: 'distanceM', label: 'Mesafe', unit: 'km', spec: { maxIntDigits: 4, maxDecimals: 2 }, toDisplay: (m) => round(m / 1000, 2), toStored: (km) => Math.round(km * 1000) };

export const FIELDS: Record<Modality, SetField[]> = {
  strength: [KG, REPS],
  time: [SEC],
  cardio: [KM, MIN],
  rounds: [MIN],
  skill: [REPS, SEC],
};

/** "62.5" → "62,5" (Turkish decimal comma). */
export const formatNumber = (n: number) => String(n).replace('.', ',');

export const parseNumber = (text: string): number | null => {
  if (!text.trim()) return null;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function displayValue(set: Pick<DraftSet, SetField['key']>, f: SetField): string {
  const v = set[f.key];
  return v === null ? '' : formatNumber(f.toDisplay(v));
}

export const patchFor = (f: SetField, n: number | null): SetPatch => ({ [f.key]: n === null ? null : f.toStored(n) });
