import { colors, gradients } from '@/theme';

/**
 * Shared rules of every bar chart (viz/BarChart and the dashboard's
 * interactive WeeklyActivityChart): one scale, one set of colors.
 */
export const BAR_COLORS = {
  /** The emphasised bar (today / selected): orange gradient. */
  highlight: gradients.orange,
  /** A bar with a value. */
  filled: colors.petrolBright,
  /** Zero or a day still to come. */
  empty: colors.dataTrack,
  /** The dashed target line. */
  goal: colors.gold,
} as const;

/**
 * Top of the scale: the largest value or the goal, times `headroom` (room for
 * a value label above the tallest bar). Never 0, so an empty week with no goal
 * draws flat bars instead of dividing by zero.
 */
export function barScaleMax(values: readonly number[], goal = 0, headroom = 1): number {
  return Math.max(goal, ...values, 1) * headroom;
}

/** Pixel height of `value` on a scale topped at `max`, for a plot `plotHeight` tall. */
export function barHeight(value: number, max: number, plotHeight: number): number {
  return (Math.max(0, value) / max) * plotHeight;
}
