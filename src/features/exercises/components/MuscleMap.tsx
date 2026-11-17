import { useIsFocused } from 'expo-router';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
import Svg, { Ellipse, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme';

import { MUSCLES, type MuscleId } from '../muscles';
import { BACK_DETAILS, FRONT_DETAILS, HEAD, SILHOUETTE, VIEWBOX, VIEWS, type BodySide } from './body-paths';

const FILL = {
  idle: 'rgba(255,255,255,0.075)',
  primary: colors.orange,
  secondary: colors.gold,
  glow: '#FFB48F',
} as const;

type Props = {
  /** Muscles drawn orange (and gently pulsing). */
  primary?: readonly MuscleId[];
  /** Muscles drawn gold. */
  secondary?: readonly MuscleId[];
  /** Outlined muscle (the one the user tapped). */
  selected?: MuscleId | null;
  /** Makes regions tappable. */
  onSelect?: (m: MuscleId) => void;
  /** Height of each figure. */
  height?: number;
  testID?: string;
};

/**
 * Interactive 2D anatomy: front and back figures side by side.
 * Pure SVG (web, iOS, Android), no images. Primary muscles get a slow
 * "heat" pulse on the UI thread; it stops when the screen is not focused
 * or Reduce Motion is on.
 */
export function MuscleMap({ primary = [], secondary = [], selected = null, onSelect, height = 300, testID }: Props) {
  const label = useMemo(() => describe(primary, secondary), [primary, secondary]);
  return (
    <View style={styles.row} testID={testID} accessible={!onSelect} accessibilityRole="image" accessibilityLabel={label}>
      {(['front', 'back'] as const).map((side) => (
        <View key={side} style={styles.col}>
          <Figure side={side} primary={primary} secondary={secondary} selected={selected} onSelect={onSelect} height={height} />
          <AppText variant="overline" color="textMuted">
            {side === 'front' ? 'Ön' : 'Arka'}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function describe(primary: readonly MuscleId[], secondary: readonly MuscleId[]) {
  const names = (ms: readonly MuscleId[]) => ms.map((m) => MUSCLES[m].tr).join(', ');
  if (!primary.length && !secondary.length) return 'Kas haritası';
  return `Kas haritası. Birincil: ${names(primary) || '—'}. İkincil: ${names(secondary) || '—'}.`;
}

type FigureProps = Required<Pick<Props, 'primary' | 'secondary' | 'height'>> & Pick<Props, 'selected' | 'onSelect'> & { side: BodySide };

const Figure = memo(function Figure({ side, primary, secondary, selected, onSelect, height }: FigureProps) {
  const width = (height * VIEWBOX.width) / VIEWBOX.height;
  const regions = VIEWS[side];
  const hot = regions.filter((r) => primary.includes(r.muscle) || (!primary.length && r.muscle === selected));

  return (
    <View style={{ width, height }} testID={`muscle-map-${side}`}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}>
        <Path d={SILHOUETTE} fill={colors.surface} stroke={colors.borderStrong} strokeWidth={1} />
        <Ellipse {...HEAD} fill={colors.surface} stroke={colors.borderStrong} strokeWidth={1} />
        {regions.map((r) => {
          const isPrimary = primary.includes(r.muscle);
          const isSecondary = !isPrimary && secondary.includes(r.muscle);
          const isSelected = r.muscle === selected;
          const fill = isPrimary || (isSelected && !primary.length) ? FILL.primary : isSecondary ? FILL.secondary : FILL.idle;
          return r.d.map((d, i) => (
            <Path
              key={`${r.muscle}-${i}`}
              d={d}
              fill={fill}
              fillOpacity={isSecondary ? 0.85 : 1}
              stroke={isSelected ? colors.text : colors.bg}
              strokeWidth={isSelected ? 2.4 : 1.6}
              strokeLinejoin="round"
              onPress={
                onSelect
                  ? () => {
                      haptics.select();
                      onSelect(r.muscle);
                    }
                  : undefined
              }
              testID={i === 0 ? `muscle-${side}-${r.muscle}` : undefined}
              // Read by tests/tools; not visible.
              {...{ 'data-state': isPrimary ? 'primary' : isSecondary ? 'secondary' : isSelected ? 'selected' : 'idle' }}
            />
          ));
        })}
        {(side === 'front' ? FRONT_DETAILS : BACK_DETAILS).map((d) => (
          <Path key={d} d={d} stroke={colors.bg} strokeOpacity={0.7} strokeWidth={1.3} fill="none" />
        ))}
      </Svg>
      {hot.length ? <Heat side={side} regions={hot.flatMap((r) => r.d)} width={width} height={height} /> : null}
    </View>
  );
});

/** Pulsing light layer over the primary muscles (pointer-transparent). */
function Heat({ regions, width, height, side }: { regions: string[]; width: number; height: number; side: BodySide }) {
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const running = focused && !reduceMotion;

  useEffect(() => {
    if (!running) {
      cancelAnimation(t);
      t.set(0);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    t.set(withRepeat(withSequence(withTiming(1, { duration: 1100, easing: ease }), withTiming(0, { duration: 1100, easing: ease })), -1));
    return () => cancelAnimation(t);
  }, [running, t]);

  const style = useAnimatedStyle(() => ({ opacity: t.get() * 0.55 }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} testID={`muscle-heat-${side}`}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}>
        {regions.map((d) => (
          <Path key={d} d={d} fill={FILL.glow} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Orange = primary, gold = secondary. */
export function MuscleLegend() {
  return (
    <View style={styles.legend}>
      <LegendItem color={FILL.primary} label="Birincil" />
      <LegendItem color={FILL.secondary} label="İkincil" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="small" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  col: { alignItems: 'center', gap: spacing.sm },
  legend: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
