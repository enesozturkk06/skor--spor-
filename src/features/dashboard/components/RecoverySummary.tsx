import { StyleSheet, View } from 'react-native';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AppText, Card, Icon, ProgressRing, Tag, type IconName } from '@/components/ui';
import { colors, spacing } from '@/theme';

import type { DashboardSnapshot } from '../dashboard-data';

const RING_DELAY = 220;

type Props = { recovery: DashboardSnapshot['recovery']; onPress?: () => void; isSample?: boolean };

export function RecoverySummary({ recovery, onPress, isSample = false }: Props) {
  const metrics: { icon: IconName; label: string; value: string }[] = [
    { icon: 'sleep', label: 'Uyku', value: `${recovery.sleepHours.toLocaleString('tr-TR')} sa` },
    { icon: 'heart-outline', label: 'Dinlenik nabız', value: `${recovery.restingHr} bpm` },
  ];
  return (
    <Card onPress={onPress} accessibilityLabel="Recovery özeti" style={styles.card}>
      <View style={styles.titleRow}>
        <AppText variant="overline" color="textMuted">
          Recovery
        </AppText>
        {isSample ? <Tag label="Örnek" tone="gold" /> : null}
      </View>
      <View style={styles.row}>
        <ProgressRing
          progress={recovery.readiness / 100}
          size={96}
          stroke={9}
          color={colors.dataRecovery}
          animated
          delay={RING_DELAY}
          accessibilityLabel={`Hazırlık yüzde ${recovery.readiness}`}
        >
          <AnimatedNumber value={recovery.readiness} format={(n) => `${n}%`} delay={RING_DELAY} variant="statM" />
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  small: { fontSize: 9 },
  metrics: { flex: 1, gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metric: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricLabel: { flex: 1 },
});
