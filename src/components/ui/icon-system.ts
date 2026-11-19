import type { IconName } from './icon-names';

/**
 * SKOR SPOR icon rules (checked by e2e/unit/icon-system.spec.ts):
 *
 * 1. Style: interface icons use the OUTLINE glyph whenever one exists.
 *    A filled glyph is only for the ACTIVE tab (`filled` below) and for the
 *    few glyphs that are solid by convention (SOLID_BY_CONVENTION).
 * 2. Meaning: one glyph per meaning. An app concept (training, recovery,
 *    records …) always uses its glyph from APP_ICONS, and no other meaning
 *    — a goal, a modality, a sport — may reuse that glyph.
 * 3. Size: 16 (inline with small text), 20 (default), 24 (navigation, tiles).
 * 4. Color: only theme tokens (Icon's `color` prop) — never a raw hex value.
 * 5. Sports: SKOR SPOR's own SVG set (./sport-glyphs.ts), never font glyphs.
 */
export const ICON_SIZES = { inline: 16, default: 20, nav: 24 } as const;

type ConceptIcon = { outline: IconName; filled?: IconName };

/** The glyph of each app concept. Tabs, modules and marketing copy all read from here. */
export const APP_ICONS = {
  home: { outline: 'home-variant-outline', filled: 'home-variant' },
  training: { outline: 'lightning-bolt-outline', filled: 'lightning-bolt' },
  exercises: { outline: 'bookshelf' },
  nutrition: { outline: 'food-apple-outline', filled: 'food-apple' },
  coach: { outline: 'brain' },
  recovery: { outline: 'heart-pulse' },
  performance: { outline: 'chart-line' },
  community: { outline: 'account-group-outline' },
  profile: { outline: 'account-circle-outline', filled: 'account-circle' },
  records: { outline: 'trophy-outline' },
  streak: { outline: 'fire' },
  goal: { outline: 'target' },
  intensity: { outline: 'speedometer' },
  breathing: { outline: 'lungs' },
  bodyWeight: { outline: 'scale-bathroom' },
} as const satisfies Record<string, ConceptIcon>;

export type AppConcept = keyof typeof APP_ICONS;

/**
 * Filled glyphs allowed anywhere: strokes and media controls whose MDI
 * "-outline" versions are hollow shapes, not lighter variants of the same icon.
 */
export const SOLID_BY_CONVENTION: readonly IconName[] = ['check', 'close', 'play', 'pause', 'plus'];
