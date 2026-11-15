import { useRouter } from 'expo-router';

import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AnimatedLogo, AppText, Button, Icon, Screen, type IconName } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { SessionExpiredNotice } from '@/features/auth/components/SessionExpiredNotice';
import { colors, radius, spacing } from '@/theme';
import { enter } from '@/components/motion/entrance';
import { useSvgId } from '@/components/ui/useSvgId';

const PILLARS: { icon: IconName; label: string }[] = [
  { icon: 'lightning-bolt', label: 'Antrenman' },
  { icon: 'food-apple', label: 'Beslenme' },
  { icon: 'heart-pulse', label: 'Recovery' },
  { icon: 'brain', label: 'AI Koç' },
];



/** Large forward-leaning "score lines" — the brand's motion motif. */
function ScoreLines({ width }: { width: number }) {
  const svgId = useSvgId('lines');
  const h = Math.min(520, width * 1.1);
  return (
    <View pointerEvents="none" style={[styles.lines, { height: h }]} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={svgId('lineOrange')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.orange} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.orange} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={svgId('lineGold')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.6} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={svgId('linePetrol')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.petrolBright} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.petrol} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M250 -20 L330 -20 L170 540 L90 540 Z" fill={`url(#${svgId('linePetrol')})`} />
        <Path d="M340 -20 L372 -20 L212 540 L180 540 Z" fill={`url(#${svgId('lineOrange')})`} />
        <Path d="M392 -20 L408 -20 L248 540 L232 540 Z" fill={`url(#${svgId('lineGold')})`} />
      </Svg>
    </View>
  );
}

// Same choreography as before (intro 700 ms, then CTAs), now on the UI thread
// via Reanimated and respecting Reduce Motion.
const INTRO_MS = 700;
const introTop = enter(0, { ms: INTRO_MS, step: 0 });
const introHero = enter(0, { ms: INTRO_MS, step: 0 });
const introCta = enter(0, { ms: 450, step: 0, delay: INTRO_MS });

export default function WelcomeScreen() {
  const router = useRouter();
  const { mode } = useAuth();
  const { width } = useWindowDimensions();

  const heroSize = width < 380 ? 52 : width < 720 ? 64 : 84;

  return (
    <Screen width="form" scroll={false}>
      <ScoreLines width={width} />
      <View style={styles.container}>
        <Animated.View entering={introTop} style={styles.top}>
          <AnimatedLogo markSize={40} textSize={30} />
          <View style={styles.notice}>
            <SessionExpiredNotice />
          </View>
        </Animated.View>

        <Animated.View entering={introHero} style={styles.hero}>
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

        <Animated.View entering={introCta} style={styles.actions}>
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
