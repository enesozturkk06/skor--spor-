import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, ProgressRing, type IconName } from '@/components/ui';
import { colors, spacing } from '@/theme';

import type { DashboardSnapshot } from '../dashboard-data';

export function RecoverySummary({ recovery, onPress }: { recovery: DashboardSnapshot['recovery']; onPress?: () => void }) {
  const metrics: { icon: IconName; label: string; value: string }[] = [
    { icon: 'sleep', label: 'Uyku', value: `${recovery.sleepHours.toLocaleString('tr-TR')} sa` },
    { icon: 'heart-outline', label: 'Dinlenik nabız', value: `${recovery.restingHr} bpm` },
  ];
  return (
    <Card onPress={onPress} accessibilityLabel="Recovery özeti" style={styles.card}>
      <AppText variant="overline" color="textMuted">
        Recovery
      </AppText>
      <View style={styles.row}>
        <ProgressRing progress={recovery.readiness / 100} size={96} stroke={9} color={colors.dataRecovery} accessibilityLabel={`Hazırlık yüzde ${recovery.readiness}`}>
          <AppText variant="statM">{recovery.readiness}%</AppText>
          <AppText variant="overline" color="textMuted" style={styles.small}>
            hazırlık
          </AppText>
        </ProgressRing>
        <View style={styles.metrics}>
          <View style={styles.status}>
            <Icon name="shield-check-outline" size={16} color="success" />
            <AppText variant="smallStrong" color="success">
              {recovery.status}
            </AppText>
          </View>
          {metrics.map((m) => (
            <View key={m.label} style={styles.metric}>
              <Icon name={m.icon} size={18} color="textMuted" />
              <AppText variant="small" color="textMuted" style={styles.metricLabel}>
                {m.label}
              </AppText>
              <AppText variant="smallStrong">{m.value}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 300 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  small: { fontSize: 9 },
  metrics: { flex: 1, gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metric: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricLabel: { flex: 1 },
});
