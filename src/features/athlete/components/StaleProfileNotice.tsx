import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { useAthlete } from '../AthleteProvider';

/** The backend was unreachable; the last profile saved on this device is shown. */
export function StaleProfileNotice() {
  const { stale, reload } = useAthlete();
  if (!stale) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Icon name="cloud-off-outline" size={18} color="warning" />
      <AppText variant="small" color="text" style={styles.text}>
        Sunucuya ulaşılamıyor. Bu cihazdaki son profilin gösteriliyor; değişiklik kaydetmek için bağlantı gerekir.
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Yeniden bağlan" hitSlop={10} onPress={reload}>
        <Icon name="refresh" size={18} color="orange" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSoft,
  },
  text: { flex: 1 },
});
