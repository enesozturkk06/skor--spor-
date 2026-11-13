import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type IconProps = { name: IconName; size?: number; color?: ColorToken };

export function Icon({ name, size = 20, color = 'text' }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={colors[color]} />;
}
