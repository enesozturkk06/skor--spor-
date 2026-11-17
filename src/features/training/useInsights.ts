import { useMemo } from 'react';

import { levelFor, xpTimeline } from './progress';
import { computeRecords, recordCountsByWorkout } from './records';
import { useTraining } from './TrainingProvider';

/**
 * Records, XP and level for the current athlete, derived from their workout
 * history and recomputed only when the history changes (cheap: one pass).
 *
 * `ready` is false while older pages are still loading: a record or an XP
 * total computed from part of the history could be wrong, so screens show a
 * "calculating" state until then.
 */
export function useInsights() {
  const { history, historyComplete } = useTraining();
  return useMemo(() => {
    const recordCounts = recordCountsByWorkout(history);
    const xp = xpTimeline(history, recordCounts);
    const totalXp = [...xp.values()].reduce((m, v) => Math.max(m, v.totalAfter), 0);
    return { ready: historyComplete, records: computeRecords(history), recordCounts, xp, totalXp, level: levelFor(totalXp) };
  }, [history, historyComplete]);
}
