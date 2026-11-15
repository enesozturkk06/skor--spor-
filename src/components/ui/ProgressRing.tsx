import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme';
import { timing } from '@/theme/motion';

import { useSvgId } from './useSvgId';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  /** 0–1 */
  progress: number;
  size?: number;
  stroke?: number;
  /** Solid color or a two-stop gradient. */
  color?: string | readonly [string, string];
  trackColor?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  /**
   * Sweep from the previous value to `progress` on the UI thread (opt-in).
   * Respects Reduce Motion. Off by default: static rings stay static.
   */
  animated?: boolean;
  /** Delay before the sweep, ms (e.g. to follow a staggered entrance). */
  delay?: number;
};

export function ProgressRing({
  progress,
  size = 120,
  stroke = 10,
  color = colors.orange,
  trackColor = colors.dataTrack,
  children,
  accessibilityLabel,
  animated = false,
  delay = 0,
}: ProgressRingProps) {
  const svgId = useSvgId('ring');
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const isGradient = Array.isArray(color);
  const fill = isGradient ? `url(#${svgId('grad')})` : (color as string);

  const shown = useSharedValue(animated ? 0 : clamped);
  useEffect(() => {
    if (animated) shown.set(withDelay(delay, withTiming(clamped, timing.slow)));
  }, [animated, clamped, delay, shown]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - shown.get()) }));

  const arc = {
    cx: size / 2,
    cy: size / 2,
    r,
    stroke: fill,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    fill: 'none',
    strokeDasharray: `${circumference} ${circumference}`,
    transform: `rotate(-90 ${size / 2} ${size / 2})`,
  };

  return (
    <View
      style={{ width: size, height: size }}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Svg width={size} height={size}>
        {isGradient ? (
          <Defs>
            <LinearGradient id={svgId('grad')} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color[0]} />
              <Stop offset="1" stopColor={color[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        {animated ? (
          <AnimatedCircle {...arc} animatedProps={animatedProps} />
        ) : (
          <Circle {...arc} strokeDashoffset={circumference * (1 - clamped)} />
        )}
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
