/**
 * SKOR SPOR sport icons — original drawings, owned by the project.
 *
 * Grid 24×24, 1.75 stroke, round caps and joins, no fills (outline family,
 * matching the interface icons). One metaphor for every sport: its defining
 * equipment, so no sport is a human figure and another an object.
 * Rendered by <Icon name="sport-…"> (SportGlyph.tsx) in the current color token.
 */

export type GlyphShape =
  | { kind: 'path'; d: string; transform?: string }
  | { kind: 'circle'; cx: number; cy: number; r: number };

export const SPORT_GLYPHS = {
  /** Kettlebell. */
  'sport-fitness': [
    { kind: 'path', d: 'M7.9 10.2 7.5 7.4A2.2 2.2 0 0 1 9.7 4.9h4.6a2.2 2.2 0 0 1 2.2 2.5l-.4 2.8' },
    { kind: 'path', d: 'M8.4 19.9a6.1 6.1 0 1 1 7.2 0Z' },
  ],
  /** Loaded barbell, side view. */
  'sport-bodybuilding': [
    { kind: 'path', d: 'M2 12h20' },
    { kind: 'path', d: 'M5 7.5h1.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5Z' },
    { kind: 'path', d: 'M17.5 7.5H19a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-1.5a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5Z' },
    { kind: 'path', d: 'M8.5 9.5v5M15.5 9.5v5' },
  ],
  /** Boxing glove with cuff. */
  'sport-boxing': [
    { kind: 'path', d: 'M8 16.5V7a3.5 3.5 0 0 1 3.5-3.5H13A5 5 0 0 1 18 8.5v3.2a4.8 4.8 0 0 1-4.8 4.8H8Z' },
    { kind: 'path', d: 'M8 10.5H6.6A1.6 1.6 0 0 0 5 12.1v.3a4.1 4.1 0 0 0 4.1 4.1' },
    { kind: 'path', d: 'M8 16.5v3a1 1 0 0 0 1 1h6.2a1 1 0 0 0 1-1v-3.3' },
    { kind: 'path', d: 'M11 9.5c1.4.9 3 1 4.5.3' },
  ],
  /** Glove with a roundhouse-kick arc. */
  'sport-kickboxing': [
    // The boxing glove, smaller, with a roundhouse-kick arc sweeping over it.
    // (boxing glove at 72%, drawn at that size so the stroke stays 1.75)
    { kind: 'path', d: 'M5.16 16.28V9.44a2.52 2.52 0 0 1 2.52-2.52h1.08a3.6 3.6 0 0 1 3.6 3.6v2.3a3.46 3.46 0 0 1-3.46 3.46H5.16Z' },
    { kind: 'path', d: 'M5.16 11.96H4.15A1.15 1.15 0 0 0 3 13.11v.22a2.95 2.95 0 0 0 2.95 2.95' },
    { kind: 'path', d: 'M5.16 16.28v2.16a.72.72 0 0 0 .72.72h4.46a.72.72 0 0 0 .72-.72v-2.38' },
    { kind: 'path', d: 'M10.5 6.5a9 9 0 0 1 10.2 4.8' },
    { kind: 'path', d: 'M21.3 8l-.6 3.3-3.2-1' },
  ],
  /** Belt knot with hanging ends. */
  'sport-karate': [
    { kind: 'path', d: 'M3 8.5h7M14 8.5h7M3 11.5h7M14 11.5h7' },
    { kind: 'path', d: 'M10.2 7h3.6a.7.7 0 0 1 .7.7v4.6a.7.7 0 0 1-.7.7h-3.6a.7.7 0 0 1-.7-.7V7.7a.7.7 0 0 1 .7-.7Z' },
    { kind: 'path', d: 'M10.6 13l-2.4 7.5M13.4 13l2.4 7.5' },
  ],
  /** Football: central pentagon with panel seams. */
  'sport-football': [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M12 8.6l3.2 2.3-1.2 3.8h-4l-1.2-3.8Z' },
    { kind: 'path', d: 'M12 8.6V3M15.2 10.9l5.3-1.7M14 14.7l3.3 4.6M10 14.7l-3.3 4.6M8.8 10.9 3.5 9.2' },
  ],
  /** Basketball seams. */
  'sport-basketball': [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M3 12h18M12 3v18' },
    { kind: 'path', d: 'M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8' },
  ],
  /** Volleyball panels. */
  /** Volleyball: three curved panel seams, rotated by 120°. */
  'sport-volleyball': [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M12 12c0-3.3 1.7-6.3 4.4-7.9' },
    { kind: 'path', d: 'M12 12c0-3.3 1.7-6.3 4.4-7.9', transform: 'rotate(120 12 12)' },
    { kind: 'path', d: 'M12 12c0-3.3 1.7-6.3 4.4-7.9', transform: 'rotate(240 12 12)' },
  ],
  /** Running shoe with laces. */
  'sport-running': [
    { kind: 'path', d: 'M3 17.5 4.2 9h3.3c.4 1.4 1.6 2.3 3 2.3l1.2-.1 2.3 2.1c1.3 1.1 2.9 1.7 4.6 1.8l1 .1a1.6 1.6 0 0 1 1.4 1.6V18a1 1 0 0 1-1 1H4' },
    { kind: 'path', d: 'M3 19.5h18' },
    { kind: 'path', d: 'M9.4 13.4l1.4-1.2M11.5 15l1.4-1.2' },
  ],
  /** Swim goggles with strap. */
  'sport-swimming': [
    { kind: 'path', d: 'M5.5 9.5h3.8a2.6 2.6 0 0 1 2.6 2.6v.3a2.6 2.6 0 0 1-2.6 2.6H6.6a2.6 2.6 0 0 1-2.6-2.6v-1.4a1.5 1.5 0 0 1 1.5-1.5Z' },
    { kind: 'path', d: 'M18.5 9.5h-3.8a2.6 2.6 0 0 0-2.6 2.6v.3a2.6 2.6 0 0 0 2.6 2.6h2.7a2.6 2.6 0 0 0 2.6-2.6v-1.4a1.5 1.5 0 0 0-1.5-1.5Z' },
    { kind: 'path', d: 'M4 11.3H2.2M20 11.3h1.8' },
    { kind: 'path', d: 'M3 19c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1' },
  ],
  /** Racket and ball. */
  'sport-tennis': [
    { kind: 'circle', cx: 14.5, cy: 9.5, r: 5.6 },
    { kind: 'path', d: 'M13 5.4v8.2M16 5.4v8.2M10.4 8h8.2M10.4 11h8.2' },
    { kind: 'path', d: 'M10.5 13.5 4.8 19.2M3.6 18l2.4 2.4' },
    { kind: 'circle', cx: 5.5, cy: 5.5, r: 1.9 },
  ],
} as const satisfies Record<string, readonly GlyphShape[]>;

export type SportGlyphName = keyof typeof SPORT_GLYPHS;

export const isSportGlyph = (name: string): name is SportGlyphName => name in SPORT_GLYPHS;
