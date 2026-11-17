import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useSvgId } from '@/components/ui/useSvgId';
import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  remainingMs: number;
  totalMs: number;
  /** Absolute end time; a change (±15 s, new phase) restarts the sweep. */
  endsAt: number;
  paused?: boolean;
  size?: number;
  stroke?: number;
  colors?: readonly [string, string];
  children?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * Countdown arc that drains continuously on the UI thread (one linear
 * animation per deadline, not per tick). Paused: frozen. Reduce Motion:
 * no sweep — it steps with the displayed seconds instead.
 */
export function CountdownRing({
  remainingMs,
  totalMs,
  endsAt,
  paused = false,
  size = 220,
  stroke = 14,
  colors: tint = [colors.orange, colors.gold],
  children,
  testID,
  accessibilityLabel,
}: Props) {
  const id = useSvgId('countdown');
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  // Whole seconds, matching the number shown in the middle.
  const stepped = totalMs > 0 ? Math.min(1, (Math.ceil(remainingMs / 1000) * 1000) / totalMs) : 0;
  const p = useSharedValue(frac);

  const sweep = !paused && !reduce;
  // Continuous: restart only when the deadline or pause state changes.
  useEffect(() => {
    if (!sweep) return;
    cancelAnimation(p);
    p.set(frac);
    p.set(withTiming(0, { duration: Math.max(0, remainingMs), easing: Easing.linear }));
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frac/remaining are read at the deadline change only
  }, [endsAt, sweep, p]);
  // Static (paused / Reduce Motion): follow the shown value.
  useEffect(() => {
    if (sweep) return;
    cancelAnimation(p);
    p.set(stepped);
  }, [sweep, stepped, p]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.get()) }));

  return (
    <View
      style={{ width: size, height: size }}
      testID={testID}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(totalMs / 1000)}
      aria-valuenow={Math.ceil(remainingMs / 1000)}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id('g')} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint[0]} />
            <Stop offset="1" stopColor={tint[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.dataTrack} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id('g')})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={props}
        />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
