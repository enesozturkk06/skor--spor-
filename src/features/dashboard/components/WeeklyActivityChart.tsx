import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { colors, gradients, radius, spacing } from '@/theme';

import type { WeekDay } from '../dashboard-data';

const CHART_HEIGHT = 132;

export function WeeklyActivityChart({ week, dailyTarget }: { week: WeekDay[]; dailyTarget: number }) {
  const max = Math.max(dailyTarget, ...week.map((d) => d.minutes)) * 1.15;
  const total = week.reduce((s, d) => s + d.minutes, 0);
  const targetY = (dailyTarget / max) * CHART_HEIGHT;

  return (
    <Card>
      <View style={styles.head}>
        <View>
          <AppText variant="overline" color="textMuted">
            Haftalık aktivite
          </AppText>
          <AppText variant="statM">
            {total}{' '}
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

      <View style={styles.chart} accessible accessibilityLabel={week.map((d) => `${d.label} ${d.minutes} dakika`).join(', ')}>
        <View style={[styles.targetLine, { bottom: targetY }]} />
        {week.map((d) => {
          const h = Math.max(4, (d.minutes / max) * CHART_HEIGHT);
          return (
            <View key={d.label} style={styles.col}>
              {d.isToday ? (
                <AppText variant="smallStrong" color="orange" style={styles.value}>
                  {d.minutes}
                </AppText>
              ) : null}
              {d.isToday ? (
                <LinearGradient colors={gradients.orange} style={[styles.bar, { height: h }]} />
              ) : (
                <View
                  style={[
                    styles.bar,
                    { height: d.isFuture ? 4 : h },
                    { backgroundColor: d.isFuture || d.minutes === 0 ? colors.dataTrack : colors.petrolBright },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {week.map((d) => (
          <AppText key={d.label} variant="small" color={d.isToday ? 'orange' : 'textFaint'} style={styles.label}>
            {d.label}
          </AppText>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  legendLine: { width: 16, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold },
  chart: { height: CHART_HEIGHT + 20, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(214,183,122,0.45)',
  },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  value: { marginBottom: spacing.xs },
  bar: { width: '100%', maxWidth: 34, borderRadius: radius.xs },
  labels: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  label: { flex: 1, textAlign: 'center' },
});
