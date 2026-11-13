import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { useAuth } from '../AuthProvider';

/** Shown once after a session ended on its own (expired or revoked elsewhere). */
export function SessionExpiredNotice() {
  const { sessionExpired, dismissSessionExpired } = useAuth();
  if (!sessionExpired) return null;
  return (
    <View style={styles.box} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="clock-alert-outline" size={18} color="warning" />
      <AppText variant="small" color="text" style={styles.text}>
        Oturumunun süresi doldu. Güvenliğin için lütfen tekrar giriş yap.
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Bildirimi kapat" hitSlop={10} onPress={dismissSessionExpired}>
        <Icon name="close" size={18} color="textMuted" />
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
