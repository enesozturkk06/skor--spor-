import { StyleSheet, View } from 'react-native';

import { AppText, Card, ProgressBar } from '@/components/ui';
import { spacing } from '@/theme';

import { MiniCardHeader } from './MiniCardHeader';

export function DailyGoalCard({ minutes, target }: { minutes: number; target: number }) {
  const progress = target > 0 ? minutes / target : 0;
  const pct = Math.min(100, Math.round(progress * 100));
  const remaining = Math.max(0, target - minutes);
  return (
    <Card accent="orange" style={styles.card}>
      <MiniCardHeader label="Hedef" icon="target" tone="orange" />
      <AppText variant="statL" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {minutes}
        <AppText variant="smallStrong" color="textMuted">
          {' '}/ {target} dk
        </AppText>
      </AppText>
      <AppText variant="small" color="textMuted">
        {remaining > 0 ? `${remaining} dk kaldı` : 'Tamamlandı'}
      </AppText>
      <View style={styles.bar}>
        <ProgressBar progress={progress} height={6} accessibilityLabel={`Günlük hedefin yüzde ${pct}'i tamamlandı`} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  value: { marginTop: spacing.md },
  bar: { marginTop: spacing.lg },
});
