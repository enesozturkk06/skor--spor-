import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

type ProgressBarProps = {
  /** 0–1 */
  progress: number;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
};

export function ProgressBar({ progress, color = colors.orange, height = 6, accessibilityLabel }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { height }]}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, backgroundColor: colors.dataTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
