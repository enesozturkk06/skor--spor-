import createIconSet from '@expo/vector-icons/createIconSet';

import { colors, type ColorToken } from '@/theme';

import glyphMap from '../../../assets/fonts/skor-icons.json';

import type { IconName as FontIconName } from './icon-names';
import { SportGlyph } from './SportGlyph';
import { isSportGlyph, type SportGlyphName } from './sport-glyphs';

/** An interface icon (font glyph) or one of SKOR SPOR's own sport icons ("sport-…"). */
export type IconName = FontIconName | SportGlyphName;
export type { SportGlyphName } from './sport-glyphs';

/**
 * Icon font with only the glyphs the app uses (see icon-names.ts and
 * scripts/build-fonts.mjs) — ~10 KB instead of the full 1.3 MB set.
 * Style and meaning rules: ./icon-system.ts.
 */
export const IconFont = createIconSet(
  glyphMap as Record<FontIconName, number>,
  'skor-icons',
  require('../../../assets/fonts/skor-icons.ttf'),
);

type IconProps = { name: IconName; size?: number; color?: ColorToken };

/**
 * Icons are decorative: the label next to them (or the button's own
 * accessibilityLabel) carries the meaning. The font glyph is a private-use
 * character, so it must never leak into a screen reader's name for the control.
 */
export function Icon({ name, size = 20, color = 'text' }: IconProps) {
  if (isSportGlyph(name)) return <SportGlyph name={name} size={size} color={colors[color]} />;
  return (
    <IconFont name={name} size={size} color={colors[color]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
  );
}
