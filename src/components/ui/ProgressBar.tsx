import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors, radius } from '@/theme';
import { timing } from '@/theme/motion';

type ProgressBarProps = {
  /** 0–1 */
  progress: number;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
  /** Grow from the previous value on the UI thread (opt-in, respects Reduce Motion). */
  animated?: boolean;
  delay?: number;
};

export function ProgressBar({ progress, color = colors.orange, height = 6, accessibilityLabel, animated = false, delay = 0 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const pct = clamped * 100;

  const shown = useSharedValue(animated ? 0 : pct);
  useEffect(() => {
    if (animated) shown.set(withDelay(delay, withTiming(pct, timing.slow)));
  }, [animated, pct, delay, shown]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${shown.get()}%` }));

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { height }]}
    >
      {animated ? (
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      ) : (
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, backgroundColor: colors.dataTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
