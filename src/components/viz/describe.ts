/**
 * Text summaries for charts: every chart is announced to screen readers as an
 * image whose label says what the picture shows. Pure functions (unit-tested).
 */

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

export const formatNumber = (n: number) => nf.format(n);

const withUnit = (n: number, unit?: string) => (unit ? `${formatNumber(n)} ${unit}` : formatNumber(n));

export const NOT_ENOUGH_DATA = 'yeterli veri yok';

/** "Haftalık dakika: 7 değer, en düşük 0 dk, en yüksek 55 dk, son 30 dk." */
export function describeSeries(label: string, values: readonly number[], unit?: string): string {
  if (values.length < 2) return `${label}: ${NOT_ENOUGH_DATA}.`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const last = values[values.length - 1];
  return `${label}: ${values.length} değer, en düşük ${withUnit(min, unit)}, en yüksek ${withUnit(max, unit)}, son ${withUnit(last, unit)}.`;
}

/** Bars: every value when the list is short, otherwise a summary with the total. */
export function describeBars(label: string, data: readonly { label: string; value: number }[], unit?: string, goal?: number): string {
  if (!data.length) return `${label}: ${NOT_ENOUGH_DATA}.`;
  const goalText = goal !== undefined ? ` Hedef ${withUnit(goal, unit)}.` : '';
  if (data.length <= 12) return `${label}: ${data.map((d) => `${d.label} ${withUnit(d.value, unit)}`).join(', ')}.${goalText}`;
  const total = data.reduce((s, d) => s + d.value, 0);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a));
  return `${label}: ${data.length} dönem, toplam ${withUnit(total, unit)}, en yüksek ${best.label} ${withUnit(best.value, unit)}.${goalText}`;
}

/** Trend: first → last with the change, plus the best point. */
export function describeTrend(label: string, points: readonly { label: string; value: number }[], unit?: string): string {
  if (points.length < 2) return `${label}: ${NOT_ENOUGH_DATA}.`;
  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce((a, b) => (b.value > a.value ? b : a));
  const diff = last.value - first.value;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  return `${label}: ${first.label} ${withUnit(first.value, unit)}, ${last.label} ${withUnit(last.value, unit)} (${sign}${withUnit(Math.abs(diff), unit)}). En yüksek ${best.label} ${withUnit(best.value, unit)}.`;
}
