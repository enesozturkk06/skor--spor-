import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export function FormError({ message, tone = 'danger' }: { message: string | null; tone?: 'danger' | 'success' }) {
  if (!message) return null;
  const success = tone === 'success';
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.box, success ? styles.success : styles.danger]}
    >
      <Icon name={success ? 'email-check-outline' : 'alert-circle-outline'} size={18} color={success ? 'success' : 'danger'} />
      <AppText variant="small" color={success ? 'success' : 'danger'} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  danger: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(255,90,95,0.3)' },
  success: { backgroundColor: 'rgba(79,209,161,0.1)', borderColor: 'rgba(79,209,161,0.3)' },
  text: { flex: 1 },
});
