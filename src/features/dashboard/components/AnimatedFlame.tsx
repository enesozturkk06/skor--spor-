import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui';
import { colors } from '@/theme';

type Props = { active: boolean; size?: number };

/**
 * Streak flame with a slow, organic flicker (scale + slight lean + glow),
 * running entirely on the UI thread. It only runs while it matters:
 * the streak is alive, the screen is focused and Reduce Motion is off.
 * Otherwise it rests at its normal size — no hidden work in the background.
 */
export function AnimatedFlame({ active, size = 18 }: Props) {
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const running = active && focused && !reduceMotion;

  useEffect(() => {
    if (!running) {
      cancelAnimation(t);
      t.set(withTiming(0, { duration: 200 }));
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    // Uneven segments read as a living flame rather than a metronome.
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: ease }),
          withTiming(0.35, { duration: 380, easing: ease }),
          withTiming(0.85, { duration: 460, easing: ease }),
          withTiming(0, { duration: 640, easing: ease }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(t);
  }, [running, t]);

  const flame = useAnimatedStyle(() => {
    const v = t.get();
    return { transform: [{ scale: 1 + v * 0.12 }, { rotate: `${(v - 0.5) * 6}deg` }, { translateY: -v * 1.5 }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: 0.25 + t.get() * 0.45, transform: [{ scale: 0.9 + t.get() * 0.3 }] }));

  return (
    <Animated.View style={styles.wrap} testID="streak-flame">
      <Animated.View style={[styles.glow, glow]} pointerEvents="none" />
      <Animated.View style={flame}>
        <Icon name="fire" size={size} color={active ? 'orange' : 'textFaint'} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.orange,
    opacity: 0,
    // soft halo; on web a blur, on native the low opacity reads as a glow
    boxShadow: `0 0 12px ${colors.orange}`,
  },
});
