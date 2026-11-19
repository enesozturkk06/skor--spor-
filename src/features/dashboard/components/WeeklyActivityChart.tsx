import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { PressableScale } from '@/components/motion/PressableScale';
import { fadeIn } from '@/components/motion/entrance';
import { AppText, Card, Tag } from '@/components/ui';
import { BAR_COLORS, barHeight, barScaleMax } from '@/components/viz/bar-scale';
import { colors, radius, spacing } from '@/theme';
import { pressScale, timing } from '@/theme/motion';

import type { WeekDay } from '../dashboard-data';

const CHART_HEIGHT = 132;
const GROW_DELAY = 180;
const GROW_STEP = 55;

/** One column. Height grows from 0 on the UI thread (Reduce Motion: instant). */
function Bar({ height, index, selected, empty }: { height: number; index: number; selected: boolean; empty: boolean }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.set(withDelay(GROW_DELAY + index * GROW_STEP, withTiming(height, timing.slow)));
  }, [h, height, index]);
  const grow = useAnimatedStyle(() => ({ height: h.get() }));

  return (
    <Animated.View style={[styles.bar, { backgroundColor: empty ? BAR_COLORS.empty : BAR_COLORS.filled }, grow]}>
      {selected ? <LinearGradient colors={BAR_COLORS.highlight} style={StyleSheet.absoluteFill} /> : null}
    </Animated.View>
  );
}

type Props = { week: WeekDay[]; dailyTarget: number; isSample?: boolean };

/**
 * Weekly minutes. Bars grow in one after another; tapping a past day shows
 * its value (today is selected by default). Every bar is an accessible button.
 */
export function WeeklyActivityChart({ week, dailyTarget, isSample = false }: Props) {
  const max = barScaleMax(week.map((d) => d.minutes), dailyTarget, 1.15);
  const total = week.reduce((s, d) => s + d.minutes, 0);
  const targetY = barHeight(dailyTarget, max, CHART_HEIGHT);
  const todayIndex = Math.max(0, week.findIndex((d) => d.isToday));
  const [selected, setSelected] = useState(todayIndex);

  return (
    <Card>
      <View style={styles.head}>
        <View>
          <View style={styles.titleRow}>
            <AppText variant="overline" color="textMuted">
              Haftalık aktivite
            </AppText>
            {isSample ? <Tag label="Örnek" tone="gold" /> : null}
          </View>
          <AppText variant="statM">
            <AnimatedNumber value={total} delay={GROW_DELAY} variant="statM" testID="week-total" />{' '}
            <AppText variant="small" color="textMuted">
              dakika
            </AppText>
          </AppText>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendLine} />
          <AppText variant="small" color="textMuted">
            Hedef {dailyTarget} dk
          </AppText>
        </View>
      </View>

      <View style={styles.chart}>
        <View style={[styles.targetLine, { bottom: targetY }]} pointerEvents="none" />
        {week.map((d, i) => {
          const h = d.isFuture ? 4 : Math.max(4, barHeight(d.minutes, max, CHART_HEIGHT));
          const isSelected = i === selected && !d.isFuture;
          return (
            <PressableScale
              key={d.label}
              scaleTo={pressScale.tile}
              haptic="select"
              disabled={d.isFuture}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={d.isFuture ? `${d.label}, henüz gelmedi` : `${d.label}, ${d.minutes} dakika`}
              aria-selected={isSelected}
              testID={`week-bar-${i}`}
              style={styles.col}
            >
              {isSelected ? (
                <Animated.View key={`v-${i}`} entering={fadeIn(0)}>
                  <AppText variant="smallStrong" color="orange" style={styles.value} testID="week-selected-value">
                    {d.minutes} dk
                  </AppText>
                </Animated.View>
              ) : null}
              <Bar height={h} index={i} selected={isSelected} empty={d.isFuture || d.minutes === 0} />
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.labels}>
        {week.map((d, i) => (
          <AppText key={d.label} variant="small" color={i === selected ? 'orange' : d.isToday ? 'text' : 'textFaint'} style={styles.label}>
            {d.label}
          </AppText>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  legendLine: { width: 16, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold },
  chart: { height: CHART_HEIGHT + 24, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(214,183,122,0.45)',
  },
  col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  value: { marginBottom: spacing.xs },
  bar: { width: '100%', maxWidth: 34, borderRadius: radius.xs, overflow: 'hidden' },
  labels: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  label: { flex: 1, textAlign: 'center' },
});
