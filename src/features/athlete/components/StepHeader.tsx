import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText, Icon } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';
import { timing } from '@/theme/motion';

const pad = (n: number) => String(n).padStart(2, '0');

/** One progress segment; its fill animates on the UI thread (Reduce Motion: instant). */
function Segment({ filled, index }: { filled: boolean; index: number }) {
  const fill = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    // Moving forward fills left to right; moving back empties without delay.
    fill.set(withDelay(filled ? index * 40 : 0, withTiming(filled ? 1 : 0, timing.base)));
  }, [fill, filled, index]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

type TopBarProps = {
  /** 1-based step being shown; 0 hides the counter (intro). */
  step: number;
  total: number;
  /** Fill all segments (summary / finished). */
  complete?: boolean;
  onBack?: () => void;
  onClose?: () => void;
};

/**
 * Persistent onboarding chrome: back, step counter, close and the progress
 * bar. It stays put while each step's content slides in underneath.
 */
export function OnboardingTopBar({ step, total, complete = false, onBack, onClose }: TopBarProps) {
  const done = complete ? total : step;
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
        {step > 0 && !complete ? (
          <AppText variant="overline" color="textMuted">
            <AppText variant="overline" color="orange">
              {pad(step)}
            </AppText>{' '}
            / {pad(total)}
          </AppText>
        ) : (
          <AppText variant="overline" color="gold">
            {complete ? 'Hazır' : ''}
          </AppText>
        )}
        {onClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} hitSlop={12} style={styles.navBtn}>
            <Icon name="close" size={22} />
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>
      <View
        style={styles.segments}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Profil adımları"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        testID="onboarding-progress"
      >
        {Array.from({ length: total }, (_, i) => (
          <Segment key={i} index={i} filled={i < done} />
        ))}
      </View>
    </View>
  );
}

/** Title + subtitle at the top of each step (slides with the step content). */
export function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.title}>
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
  wrap: { gap: spacing.md, marginBottom: spacing.lg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: layout.minTouch, height: layout.minTouch, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.dataTrack, overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 2, backgroundColor: colors.orange },
  title: { gap: spacing.md, marginBottom: spacing.xxl },
});
