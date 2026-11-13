import type { TextStyle } from 'react-native';

import { fonts } from './tokens';

/**
 * Type scale. Display styles use Barlow Condensed (athletic, numeric),
 * body styles use Inter (legible UI text).
 */
export const typography = {
  hero: { fontFamily: fonts.displayItalic, fontSize: 56, lineHeight: 54, letterSpacing: 0.5, textTransform: 'uppercase' },
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: 0.4, textTransform: 'uppercase' },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: 0.3, textTransform: 'uppercase' },
  h2: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 28, letterSpacing: 0.3, textTransform: 'uppercase' },
  h3: { fontFamily: fonts.bodySemiBold, fontSize: 17, lineHeight: 22 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' },
  statXL: { fontFamily: fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -0.5 },
  statL: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38 },
  statM: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 28 },
  button: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
