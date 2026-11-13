import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type ChipProps = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  tone?: 'orange' | 'gold';
  onPress?: () => void;
  disabled?: boolean;
};

export function Chip({ label, icon, selected = false, tone = 'orange', onPress, disabled }: ChipProps) {
  const activeColor = tone === 'orange' ? 'orange' : 'gold';
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      aria-checked={onPress ? selected : undefined}
      aria-disabled={onPress ? Boolean(disabled) : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && {
          borderColor: colors[activeColor],
          backgroundColor: tone === 'orange' ? colors.orangeSoft : colors.goldSoft,
        },
        disabled && !selected && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={selected ? activeColor : 'textMuted'} /> : null}
      <AppText variant="smallStrong" color={selected ? 'text' : 'textMuted'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
