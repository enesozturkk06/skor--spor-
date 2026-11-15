import createIconSet from '@expo/vector-icons/createIconSet';

import { colors, type ColorToken } from '@/theme';

import glyphMap from '../../../assets/fonts/skor-icons.json';

import type { IconName } from './icon-names';

export type { IconName } from './icon-names';

/**
 * Icon font with only the glyphs the app uses (see icon-names.ts and
 * scripts/build-fonts.mjs) — ~10 KB instead of the full 1.3 MB set.
 */
export const IconFont = createIconSet(
  glyphMap as Record<IconName, number>,
  'skor-icons',
  require('../../../assets/fonts/skor-icons.ttf'),
);

type IconProps = { name: IconName; size?: number; color?: ColorToken };

export function Icon({ name, size = 20, color = 'text' }: IconProps) {
  return <IconFont name={name} size={size} color={colors[color]} />;
}
