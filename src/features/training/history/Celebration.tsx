import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui';
import { colors } from '@/theme';

const SPARKS = 12;
const SIZE = 168;

/**
 * Finish burst: rings expand and sparks fly out from the centre once, then the
 * badge breathes softly. All on the UI thread; Reduce Motion shows the badge
 * only, at rest.
 */
export function Celebration({ icon = 'trophy-outline', tone = 'orange' }: { icon?: IconName; tone?: 'orange' | 'gold' }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }));
    breathe.set(withDelay(900, withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 1400 })), 3)));
  }, [reduce, t, breathe]);

  const badge = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.get() * 0.05 }] }));
  const color = tone === 'gold' ? colors.gold : colors.orange;

  return (
    <View style={styles.wrap} testID="celebration" pointerEvents="none">
      {!reduce ? (
        <>
          {[0, 1, 2].map((i) => (
            <Ring key={i} t={t} index={i} color={i === 1 ? colors.gold : color} />
          ))}
          {Array.from({ length: SPARKS }, (_, i) => (
            <Spark key={i} t={t} angle={(i / SPARKS) * Math.PI * 2} color={i % 3 === 0 ? colors.gold : color} far={i % 2 === 0} />
          ))}
        </>
      ) : null}
      <Animated.View entering={ZoomIn.duration(420).reduceMotion(ReduceMotion.System)} style={[styles.badge, { borderColor: color }, badge]}>
        <Icon name={icon} size={56} color={tone} />
      </Animated.View>
    </View>
  );
}

function Ring({ t, index, color }: { t: SharedValue<number>; index: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, t.get() * 1.4 - index * 0.18));
    return { opacity: interpolate(p, [0, 0.15, 1], [0, 0.7, 0]), transform: [{ scale: interpolate(p, [0, 1], [0.5, 1.6 + index * 0.25]) }] };
  });
  return <Animated.View style={[styles.ring, { borderColor: color }, style]} />;
}

function Spark({ t, angle, color, far }: { t: SharedValue<number>; angle: number; color: string; far: boolean }) {
  const style = useAnimatedStyle(() => {
    const p = t.get();
    const d = interpolate(p, [0, 1], [20, far ? 118 : 92]);
    return {
      opacity: interpolate(p, [0, 0.1, 0.75, 1], [0, 1, 0.9, 0]),
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: interpolate(p, [0, 1], [1, 0.4]) }],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { width: SIZE * 1.6, height: SIZE * 1.4, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2 },
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  badge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: colors.bgRaised,
    boxShadow: `0 0 36px rgba(255,113,56,0.45)`,
  },
});
