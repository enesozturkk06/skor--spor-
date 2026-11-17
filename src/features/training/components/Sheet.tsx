import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';
import { duration, easing } from '@/theme/motion';

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
};

/**
 * Bottom sheet over the workout screen (preset entrances only — see
 * entrance.ts). Tapping the backdrop closes it; it is a dialog for screen readers.
 */
export function Sheet({ title, subtitle, onClose, children, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(duration.base).easing(easing.out).reduceMotion(ReduceMotion.System)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}
        accessibilityViewIsModal
        role="dialog"
        aria-label={title}
        testID={testID}
      >
        <View style={styles.grabber} />
        <View style={styles.head}>
          <AppText variant="h2" accessibilityRole="header">
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" color="textMuted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.formMaxWidth + 40,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginHorizontal: 'auto',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  head: { gap: spacing.xs },
});
