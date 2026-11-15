import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon, type IconName } from '@/components/ui';
import { pressScale, spring } from '@/theme/motion';
import { colors, radius, spacing } from '@/theme';

type SelectTileProps = {
  label: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  /** 'tile' = square grid card, 'row' = full-width list row. */
  layout?: 'tile' | 'row';
  multi?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Selected icon "pops" with a spring (UI thread); no-op under Reduce Motion. */
function useSelectPop(selected: boolean) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!selected || reduceMotion) return;
    scale.set(withSequence(withTiming(1.18, { duration: 110 }), withSpring(1, spring.select)));
  }, [selected, reduceMotion, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

export function SelectTile({ label, icon, selected, onPress, layout = 'tile', multi = false, disabled, style }: SelectTileProps) {
  const pop = useSelectPop(selected);
  return (
    <PressableScale
      scaleTo={pressScale.tile}
      haptic="select"
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      aria-disabled={Boolean(disabled)}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        layout === 'tile' ? styles.tile : styles.row,
        selected && styles.selected,
        disabled && !selected && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Animated.View style={[styles.icon, selected && styles.iconSelected, pop]}>
        <Icon name={icon} size={layout === 'tile' ? 26 : 22} color={selected ? 'textOnOrange' : 'gold'} />
      </Animated.View>
      <AppText variant="title" color={selected ? 'text' : 'textMuted'} style={layout === 'row' ? styles.rowLabel : undefined} numberOfLines={1}>
        {label}
      </AppText>
      {selected ? (
        <Animated.View
          entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)}
          style={[styles.check, layout === 'tile' && styles.checkTile]}
        >
          <Icon name="check" size={14} color="textOnOrange" />
        </Animated.View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 112,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowLabel: { flex: 1 },
  selected: { borderColor: colors.orange, backgroundColor: colors.surfaceAlt },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.92 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  iconSelected: { backgroundColor: colors.orange },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
  },
  checkTile: { position: 'absolute', top: spacing.md, right: spacing.md },
});
