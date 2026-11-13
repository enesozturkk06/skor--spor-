import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme';

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
};

export function ProgressRing({
  progress,
  size = 120,
  stroke = 10,
  color = colors.orange,
  trackColor = colors.dataTrack,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const isGradient = Array.isArray(color);

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
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={color[0]} />
              <Stop offset="1" stopColor={color[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={isGradient ? `url(#${gradientId})` : (color as string)}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
