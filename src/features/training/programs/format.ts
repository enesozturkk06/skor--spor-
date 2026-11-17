import { formatClock } from '../timers';
import { KIND_META } from '../template-model';
import type { TemplateBlock, TemplateSet } from '../types';
import { describeSet } from '../previous';

/** "6 × 3:00 · dinlenme 1:00" for rounds; "Ö 1 × 12 · 4 × 8 · D 1 × 12" for sets (equal neighbours grouped). */
export function summarizeBlock(b: TemplateBlock): string {
  if (b.rounds) return `${b.rounds.rounds} raund × ${formatClock(b.rounds.roundS)} · dinlenme ${formatClock(b.rounds.restS)}`;
  const groups: { set: TemplateSet; n: number }[] = [];
  for (const s of b.sets) {
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.set) === JSON.stringify(s)) last.n += 1;
    else groups.push({ set: s, n: 1 });
  }
  return groups
    .map(({ set, n }) => {
      const kind = set.kind === 'normal' ? '' : `${KIND_META[set.kind].short} `;
      const what = describeSet({ ...set }).replace(/^× /, '');
      return `${kind}${n} × ${what}`;
    })
    .join(' · ');
}
