/**
 * Data visualization and identity components (Phase 2A).
 *
 * Deliberately NOT re-exported from '@/components/ui': that barrel is part of
 * the first download on every page, so screens import these from here only
 * where they are used. Every chart is announced as an image with a text
 * summary (./describe.ts) and never invents data points.
 */
export { Badge } from './Badge';
export { BarChart, type Bar } from './BarChart';
export { describeBars, describeSeries, describeTrend, formatNumber, NOT_ENOUGH_DATA } from './describe';
export { MetricRing } from './MetricRing';
export { Sparkline } from './Sparkline';
export { SportMotif } from './SportMotif';
export { StatTile, type StatDelta } from './StatTile';
export { TrendLine, type TrendPoint } from './TrendLine';
