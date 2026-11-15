import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius as radii } from '@/theme';
import { easing } from '@/theme/motion';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Placeholder block with a slow opacity pulse (UI thread). An opacity pulse
 * is the cheapest skeleton effect — no gradients or layout per frame — so it
 * stays smooth on low-end phones. Static under Reduce Motion.
 */
export function Skeleton({ width = '100%', height = 14, radius = radii.sm, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(1, { duration: 900, easing: easing.inOut }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceAlt }, pulse, style]}
      importantForAccessibility="no"
    />
  );
}

/** Groups skeleton blocks and announces the loading state once to screen readers. */
export function SkeletonGroup({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} aria-busy style={style}>
      {children}
    </View>
  );
}
