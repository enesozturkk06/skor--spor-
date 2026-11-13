import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

type StepHeaderProps = {
  step: number;
  total: number;
  title: string;
  subtitle: string;
  onBack?: () => void;
  onClose?: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function StepHeader({ step, total, title, subtitle, onBack, onClose }: StepHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={onBack} hitSlop={12} style={styles.navBtn}>
            <Icon name="arrow-left" size={22} />
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
        <AppText variant="overline" color="textMuted">
          <AppText variant="overline" color="orange">
            {pad(step)}
          </AppText>{' '}
          / {pad(total)}
        </AppText>
        {onClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} hitSlop={12} style={styles.navBtn}>
            <Icon name="close" size={22} />
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>
      <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < step && styles.segmentDone]} />
        ))}
      </View>
      <AppText variant="display" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="body" color="textMuted">
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.xxl },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.dataTrack },
  segmentDone: { backgroundColor: colors.orange },
});
