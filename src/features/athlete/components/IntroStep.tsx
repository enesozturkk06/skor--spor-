import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedLogo, AppText, Icon, type IconName } from '@/components/ui';
import { afterLogo } from '@/components/ui/AnimatedLogo';
import { colors, radius, spacing } from '@/theme';

const STEPS: { icon: IconName; label: string }[] = [
  { icon: 'dumbbell', label: 'Ana branşın' },
  { icon: 'lightning-bolt', label: 'Ek branşların' },
  { icon: 'target', label: 'Hedeflerin' },
  { icon: 'ruler', label: 'Fiziksel bilgilerin' },
];

/** Cinematic first screen of onboarding: the brand assembles, then the plan appears. */
export function IntroStep({ firstName }: { firstName: string }) {
  return (
    <View style={styles.wrap} testID="onboarding-intro">
      <View style={styles.logo}>
        <AnimatedLogo markSize={76} textSize={46} />
      </View>
      <Animated.View entering={afterLogo(0)} style={styles.copy}>
        <AppText variant="display" accessibilityRole="header">
          Hoş geldin, <AppText variant="display" color="orange">{firstName}</AppText>
        </AppText>
        <AppText variant="body" color="textMuted">
          4 kısa adımda sana özel sporcu profilini kuralım. Antrenman, beslenme ve toparlanma önerilerin bu bilgilere göre şekillenir.
        </AppText>
      </Animated.View>
      <View style={styles.list}>
        {STEPS.map((s, i) => (
          <Animated.View key={s.label} entering={afterLogo(120 + i * 90)} style={styles.item}>
            <View style={styles.badge}>
              <AppText variant="overline" color="orange">
                {String(i + 1).padStart(2, '0')}
              </AppText>
            </View>
            <Icon name={s.icon} size={18} color="gold" />
            <AppText variant="bodyStrong">{s.label}</AppText>
          </Animated.View>
        ))}
      </View>
      <Animated.View entering={afterLogo(520)}>
        <AppText variant="small" color="textFaint">
          Yarıda bırakırsan kaldığın yerden devam edersin.
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxl, paddingTop: spacing.lg },
  logo: { alignItems: 'flex-start' },
  copy: { gap: spacing.md },
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
});
