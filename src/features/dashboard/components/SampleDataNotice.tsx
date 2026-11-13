import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/** Honest disclosure: activity numbers are illustrative until tracking ships. */
export function SampleDataNotice() {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Icon name="information-outline" size={16} color="gold" />
      <AppText variant="small" color="textMuted" style={styles.text}>
        <AppText variant="smallStrong" color="gold">
          Örnek veri.{' '}
        </AppText>
        Antrenman takibi açılana kadar aktivite rakamları örnektir. Hedeflerin profiline göre hesaplanır.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { flex: 1 },
});
