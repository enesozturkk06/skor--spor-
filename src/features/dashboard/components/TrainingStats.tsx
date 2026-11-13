import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, type IconName } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import type { DashboardSnapshot } from '../dashboard-data';

type Stat = { icon: IconName; label: string; value: string; unit: string };

export function TrainingStats({ stats }: { stats: DashboardSnapshot['stats'] }) {
  const hours = Math.floor(stats.minutes / 60);
  const mins = stats.minutes % 60;
  const items: Stat[] = [
    { icon: 'calendar-check', label: 'Antrenman', value: String(stats.sessions), unit: 'seans' },
    { icon: 'timer-outline', label: 'Toplam süre', value: hours > 0 ? `${hours} sa ${mins}` : String(mins), unit: 'dk' },
    { icon: 'fire', label: 'Yakılan', value: stats.calories.toLocaleString('tr-TR'), unit: 'kcal' },
    { icon: 'speedometer', label: 'Ort. yoğunluk', value: stats.avgIntensity.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), unit: '/10' },
  ];
  return (
    <View style={styles.grid}>
      {items.map((s) => (
        <Card key={s.label} style={styles.tile} padded={false}>
          <View style={styles.tileInner}>
            <View style={styles.iconWrap}>
              <Icon name={s.icon} size={18} color="gold" />
            </View>
            <AppText variant="small" color="textMuted">
              {s.label}
            </AppText>
            <AppText variant="statM" numberOfLines={1} adjustsFontSizeToFit>
              {s.value}{' '}
              <AppText variant="small" color="textMuted">
                {s.unit}
              </AppText>
            </AppText>
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
