import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, Tag, type IconName } from '@/components/ui';
import { spacing } from '@/theme';

type Props = { onPress?: () => void };

const PLANNED: { icon: IconName; label: string }[] = [
  { icon: 'heart-pulse', label: 'Günlük hazırlık skoru' },
  { icon: 'sleep', label: 'Uyku ve dinlenik nabız' },
  { icon: 'meditation', label: 'Mobilite ve esneme rutinleri' },
];

/** Recovery tracking is not live: no readiness, sleep or heart-rate values are shown. */
export function RecoverySummary({ onPress }: Props) {
  return (
    <Card onPress={onPress} accessibilityLabel="Recovery: yakında" style={styles.card}>
      <View style={styles.titleRow} testID="recovery-card">
        <AppText variant="overline" color="textMuted">
          Recovery
        </AppText>
        <Tag label="Yakında" tone="gold" />
      </View>
      <View style={styles.list}>
        {PLANNED.map((p) => (
          <View key={p.label} style={styles.item}>
            <Icon name={p.icon} size={18} color="textMuted" />
            <AppText variant="small" color="textMuted">
              {p.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="small" color="textFaint" style={styles.foot}>
        Toparlanma verisi toplanmadığı için burada henüz bir değer gösterilmez.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 300 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { gap: spacing.md, marginTop: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  foot: { marginTop: spacing.md },
});
