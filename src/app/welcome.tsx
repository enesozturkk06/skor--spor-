import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AppText, Button, Icon, Logo, Screen, type IconName } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { SessionExpiredNotice } from '@/features/auth/components/SessionExpiredNotice';
import { colors, radius, spacing } from '@/theme';

const PILLARS: { icon: IconName; label: string }[] = [
  { icon: 'lightning-bolt', label: 'Antrenman' },
  { icon: 'food-apple', label: 'Beslenme' },
  { icon: 'heart-pulse', label: 'Recovery' },
  { icon: 'brain', label: 'AI Koç' },
];

const useNativeDriver = Platform.OS !== 'web';

/** Large forward-leaning "score lines" — the brand's motion motif. */
function ScoreLines({ width }: { width: number }) {
  const h = Math.min(520, width * 1.1);
  return (
    <View pointerEvents="none" style={[styles.lines, { height: h }]} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="lineOrange" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.orange} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.orange} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="lineGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.6} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="linePetrol" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.petrolBright} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.petrol} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M250 -20 L330 -20 L170 540 L90 540 Z" fill="url(#linePetrol)" />
        <Path d="M340 -20 L372 -20 L212 540 L180 540 Z" fill="url(#lineOrange)" />
        <Path d="M392 -20 L408 -20 L248 540 L232 540 Z" fill="url(#lineGold)" />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { mode } = useAuth();
  const { width } = useWindowDimensions();
  const [intro] = useState(() => new Animated.Value(0));
  const [cta] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(intro, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.timing(cta, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver }),
    ]).start();
  }, [intro, cta]);

  const rise = (v: Animated.Value, d = 24) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
  });

  const heroSize = width < 380 ? 52 : width < 720 ? 64 : 84;

  return (
    <Screen width="form" scroll={false}>
      <ScoreLines width={width} />
      <View style={styles.container}>
        <Animated.View style={[styles.top, rise(intro, 12)]}>
          <Logo size="md" />
          <View style={styles.notice}>
            <SessionExpiredNotice />
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, rise(intro)]}>
          <AppText variant="overline" color="gold" style={styles.kicker}>
            Sporcu performans platformu
          </AppText>
          <AppText variant="hero" style={{ fontSize: heroSize, lineHeight: heroSize * 0.96 }}>
            Own your{'\n'}
            <AppText variant="hero" color="orange" style={{ fontSize: heroSize, lineHeight: heroSize * 0.96 }}>
              performance.
            </AppText>
          </AppText>
          <AppText variant="body" color="textMuted" style={styles.lead}>
            Antrenman, beslenme, toparlanma ve analiz — tek platformda, senin branşına göre.
          </AppText>
          <View style={styles.pillars}>
            {PILLARS.map((p) => (
              <View key={p.label} style={styles.pillar}>
                <Icon name={p.icon} size={16} color="gold" />
                <AppText variant="smallStrong" color="textMuted">
                  {p.label}
                </AppText>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.actions, rise(cta, 16)]}>
          <Button label="Hemen başla" iconRight="arrow-right" onPress={() => router.push('/sign-up')} />
          <Button label="Giriş yap" variant="secondary" onPress={() => router.push('/sign-in')} />
          {mode === 'demo' ? (
            <AppText variant="small" color="textFaint" align="center">
              Demo modu · Veriler yalnızca bu cihazda saklanır
            </AppText>
          ) : null}
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lines: { position: 'absolute', top: 0, right: 0, left: 0, opacity: 0.55 },
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: spacing.lg },
  top: { paddingTop: spacing.sm },
  notice: { marginTop: spacing.lg },
  hero: { gap: spacing.lg },
  kicker: { marginBottom: -spacing.xs },
  lead: { maxWidth: 380 },
  pillars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pillar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(15,27,26,0.7)',
  },
  actions: { gap: spacing.md },
});
