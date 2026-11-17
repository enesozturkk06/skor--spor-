import type { LoggedSet, SetKind, WorkoutEntry } from './types';
import type { SetPatch } from './workout-model';

export type PreviousPerformance = { endedAt: string; sets: LoggedSet[] };

/**
 * The athlete's last session of an exercise (newest finished workout that
 * contains it). Rejected (refused by the server) workouts are skipped.
 */
export function previousPerformance(history: readonly WorkoutEntry[], exerciseKey: string): PreviousPerformance | null {
  let best: WorkoutEntry | null = null;
  for (const w of history) {
    if (w.sync === 'rejected' || !w.sets.some((s) => s.exerciseKey === exerciseKey)) continue;
    if (!best || Date.parse(w.endedAt) > Date.parse(best.endedAt)) best = w;
  }
  if (!best) return null;
  return { endedAt: best.endedAt, sets: best.sets.filter((s) => s.exerciseKey === exerciseKey).sort((a, b) => a.setIndex - b.setIndex) };
}

/** Last time's set at the same position (or the last one), as values to pre-fill. */
export function previousFill(prev: PreviousPerformance | null, setNumber: number): SetPatch | null {
  if (!prev?.sets.length) return null;
  const s = prev.sets[Math.min(setNumber, prev.sets.length) - 1];
  return { reps: s.reps, weightKg: s.weightKg, durationS: s.durationS, distanceM: s.distanceM };
}

const kg = (n: number) => `${String(n).replace('.', ',')} kg`;
const km = (m: number) => `${String(Math.round(m / 10) / 100).replace('.', ',')} km`;
function dur(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? (r ? `${m}:${String(r).padStart(2, '0')} dk` : `${m} dk`) : `${r} sn`;
}

/** "60 kg × 8", "1:30 dk", "5 km · 25 dk", "× 12". */
export function describeSet(s: Pick<LoggedSet, 'reps' | 'weightKg' | 'durationS' | 'distanceM'> & { kind?: SetKind }): string {
  const parts: string[] = [];
  if (s.distanceM !== null) parts.push(km(s.distanceM));
  if (s.weightKg !== null && s.reps !== null) parts.push(`${kg(s.weightKg)} × ${s.reps}`);
  else if (s.reps !== null) parts.push(`× ${s.reps}`);
  else if (s.weightKg !== null) parts.push(kg(s.weightKg));
  if (s.durationS !== null) parts.push(dur(s.durationS));
  return parts.join(' · ') || '—';
}
