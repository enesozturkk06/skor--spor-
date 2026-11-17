import { StyleSheet, View } from 'react-native';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AppText, Card, Icon, type IconName } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { stagger } from '@/theme/motion';

import type { DashboardSnapshot } from '../dashboard-data';

type Stat = { icon: IconName; label: string; value: number | null; decimals?: number; format: (n: number) => string; unit: string; testID: string };

const tr = (n: number, decimals = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h} sa ${minutes % 60}` : String(minutes);
};

/** This week's logged training. Values count up one tile after another; "—" when there is nothing to show. */
export function TrainingStats({ stats }: { stats: DashboardSnapshot['stats'] }) {
  const items: Stat[] = [
    { icon: 'calendar-check', label: 'Antrenman', value: stats.sessions, format: (n) => String(n), unit: 'seans', testID: 'stat-sessions' },
    { icon: 'timer-outline', label: 'Toplam süre', value: stats.minutes, format: duration, unit: 'dk', testID: 'stat-minutes' },
    { icon: 'check', label: 'Tamamlanan set', value: stats.sets, format: (n) => String(n), unit: 'set', testID: 'stat-sets' },
    { icon: 'speedometer', label: 'Ort. zorluk', value: stats.avgRpe, decimals: 1, format: (n) => tr(n, 1), unit: 'RPE', testID: 'stat-rpe' },
  ];
  return (
    <View style={styles.grid}>
      {items.map((s, i) => (
        <Card key={s.label} style={styles.tile} padded={false}>
          <View style={styles.tileInner}>
            <View style={styles.iconWrap}>
              <Icon name={s.icon} size={18} color="gold" />
            </View>
            <AppText variant="small" color="textMuted">
              {s.label}
            </AppText>
            {s.value === null ? (
              <AppText variant="statM" color="textFaint" testID={s.testID} accessibilityLabel={`${s.label}: veri yok`}>
                —
              </AppText>
            ) : (
              <AppText variant="statM" numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={`${s.label} ${s.format(s.value)} ${s.unit}`}>
                <AnimatedNumber value={s.value} decimals={s.decimals} format={s.format} delay={120 + i * stagger} variant="statM" testID={s.testID} />{' '}
                <AppText variant="small" color="textMuted">
                  {s.unit}
                </AppText>
              </AppText>
            )}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexGrow: 1, flexBasis: '45%', minWidth: 140 },
  tileInner: { padding: spacing.lg, gap: spacing.xs },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
