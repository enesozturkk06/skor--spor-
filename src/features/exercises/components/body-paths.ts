import type { MuscleId } from '../muscles';

/**
 * Hand-drawn 2D anatomy for the muscle map (viewBox 0 0 200 400).
 *
 * Each region is drawn once for the figure's left half as a polygon and
 * mirrored around x = 100, then smoothed into soft "plates". Pure data:
 * no runtime cost beyond building the strings once at import time.
 */
export const VIEWBOX = { width: 200, height: 400 } as const;

type Pt = readonly [number, number];
type Half = readonly Pt[];

/** Closed Catmull-Rom spline through the points (tension 0..1, lower = rounder). */
function smooth(points: readonly Pt[], tension = 0.32): string {
  const n = points.length;
  const p = (i: number) => points[(i + n) % n];
  let d = `M${p(0)[0]} ${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1);
    const [x1, y1] = p(i);
    const [x2, y2] = p(i + 1);
    const [x3, y3] = p(i + 2);
    const t = (1 - tension) / 6;
    const c1x = x1 + (x2 - x0) * t;
    const c1y = y1 + (y2 - y0) * t;
    const c2x = x2 - (x3 - x1) * t;
    const c2y = y2 - (y3 - y1) * t;
    d += `C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(x2)} ${r(y2)}`;
  }
  return `${d}Z`;
}
const r = (v: number) => Math.round(v * 10) / 10;
const mirror = (pts: Half): Pt[] => pts.map(([x, y]) => [200 - x, y] as const).reverse();

/** Both halves of a symmetric region. */
const pair = (pts: Half, tension?: number) => [smooth(pts, tension), smooth(mirror(pts), tension)];

/** A region that straddles the midline: the left half plus its mirror as one outline. */
function center(pts: Half, tension?: number): string[] {
  return [smooth([...pts, ...mirror(pts)], tension)];
}

/* ------------------------------------------------------------- outline */

const SILHOUETTE_HALF: Half = [
  [100, 54], [91, 56], [90, 65], [76, 70], [62, 73], [53, 82], [49, 98], [47, 124],
  [44, 150], [39, 176], [36, 202], [32, 214], [33, 230], [41, 233], [45, 216], [48, 205],
  [55, 180], [60, 154], [64, 128], [67, 112], [70, 134], [72, 162], [67, 188], [65, 214],
  [67, 250], [71, 280], [69, 312], [73, 350], [76, 368], [69, 384], [78, 391], [92, 389],
  [91, 370], [92, 340], [93, 304], [92, 284], [96, 252], [98, 214], [100, 208],
];

export const SILHOUETTE = smooth([...SILHOUETTE_HALF, ...mirror(SILHOUETTE_HALF).slice(1, -1)], 0.45);
export const HEAD = { cx: 100, cy: 30, rx: 17, ry: 22 } as const;

/* ------------------------------------------------------------- regions */

const ARM_UPPER: Half = [[60, 104], [54, 112], [51, 128], [52, 144], [58, 146], [63, 130], [65, 112]];
const FOREARM: Half = [[51, 153], [45, 172], [41, 196], [46, 200], [53, 180], [58, 156]];
const SIDE_DELT: Half = [[62, 76], [55, 84], [52, 98], [55, 108], [59, 100], [58, 86]];

export type Region = { muscle: MuscleId; d: string[] };

export const FRONT: Region[] = [
  { muscle: 'traps', d: pair([[90, 63], [78, 70], [90, 73]]) },
  { muscle: 'front_delts', d: pair([[77, 73], [65, 76], [60, 86], [61, 100], [67, 95], [72, 86], [80, 80]]) },
  { muscle: 'side_delts', d: pair(SIDE_DELT) },
  { muscle: 'chest', d: pair([[82, 80], [74, 87], [69, 103], [73, 114], [87, 118], [98, 114], [98, 81], [90, 77]]) },
  { muscle: 'biceps', d: pair(ARM_UPPER) },
  { muscle: 'forearms', d: pair(FOREARM) },
  { muscle: 'obliques', d: pair([[73, 118], [86, 122], [86, 152], [89, 183], [77, 175], [73, 150]]) },
  { muscle: 'abs', d: center([[89, 121], [99, 121], [99, 186], [91, 184], [88, 152]], 0.5) },
  { muscle: 'hip_flexors', d: pair([[77, 181], [90, 189], [97, 203], [88, 206], [79, 196]]) },
  { muscle: 'quads', d: pair([[70, 195], [66, 222], [68, 252], [74, 276], [86, 278], [92, 256], [92, 226], [86, 207], [78, 199]]) },
  { muscle: 'adductors', d: pair([[93, 211], [98, 213], [98, 240], [94, 255], [92, 232]]) },
  { muscle: 'calves', d: pair([[72, 291], [70, 316], [74, 343], [80, 349], [86, 330], [88, 302], [84, 289]]) },
];

export const BACK: Region[] = [
  { muscle: 'traps', d: center([[99, 57], [92, 60], [77, 70], [88, 85], [99, 110]], 0.4) },
  { muscle: 'rear_delts', d: pair([[75, 72], [64, 76], [59, 86], [61, 100], [68, 94], [76, 83]]) },
  { muscle: 'side_delts', d: pair(SIDE_DELT) },
  { muscle: 'upper_back', d: pair([[77, 86], [87, 89], [97, 114], [96, 120], [85, 111], [73, 100], [71, 92]]) },
  { muscle: 'lats', d: pair([[70, 103], [84, 114], [97, 125], [97, 143], [88, 156], [78, 162], [72, 140], [68, 114]]) },
  { muscle: 'triceps', d: pair(ARM_UPPER) },
  { muscle: 'forearms', d: pair(FOREARM) },
  { muscle: 'lower_back', d: center([[99, 146], [91, 158], [85, 171], [90, 183], [99, 183]], 0.4) },
  { muscle: 'glutes', d: pair([[71, 189], [68, 206], [74, 220], [88, 224], [97, 216], [97, 192], [88, 186]]) },
  { muscle: 'hamstrings', d: pair([[69, 227], [68, 252], [74, 276], [86, 278], [93, 256], [95, 232], [88, 228]]) },
  { muscle: 'calves', d: pair([[72, 290], [68, 310], [72, 336], [80, 341], [88, 326], [90, 300], [84, 288]]) },
];

/** Decorative detail lines (six-pack, sternum, spine) drawn over the plates. */
export const FRONT_DETAILS = [
  'M99 84 L99 114',
  'M90 140 L98 140 M102 140 L110 140',
  'M90 158 L98 158 M102 158 L110 158',
  'M100 123 L100 182',
];
export const BACK_DETAILS = ['M100 112 L100 184'];

export const VIEWS = { front: FRONT, back: BACK } as const;
export type BodySide = keyof typeof VIEWS;

/** Which views a muscle appears on (for the "where is it" hint). */
export function sidesOf(m: MuscleId): BodySide[] {
  return (Object.keys(VIEWS) as BodySide[]).filter((s) => VIEWS[s].some((r) => r.muscle === m));
}
