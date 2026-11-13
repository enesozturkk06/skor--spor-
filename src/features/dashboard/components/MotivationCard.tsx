import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export function MotivationCard({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['rgba(255,113,56,0.18)', 'rgba(214,183,122,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Icon name="format-quote-open" size={28} color="orange" />
      <AppText variant="h2" style={styles.message}>
        {message}
      </AppText>
      <AppText variant="overline" color="gold">
        Own your performance.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,113,56,0.25)',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  message: { textTransform: 'none', fontSize: 26, lineHeight: 30 },
});
