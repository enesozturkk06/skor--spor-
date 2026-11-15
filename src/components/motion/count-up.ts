/**
 * Pure math for count-up numbers (kept free of React so it is unit-testable).
 */

/** Cubic ease-out: fast start, soft landing (close to motion.easing.out). */
export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/**
 * Value shown at `elapsed` ms of an animation from `from` to `to`.
 * Rounded to `decimals`; lands exactly on `to` at (and after) the end.
 */
export function countUpValue(from: number, to: number, elapsed: number, durationMs: number, decimals = 0): number {
  if (durationMs <= 0 || elapsed >= durationMs) return to;
  const raw = from + (to - from) * easeOutCubic(elapsed / durationMs);
  const f = 10 ** decimals;
  return Math.round(raw * f) / f;
}
