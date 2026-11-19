import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { AppText, Button, Logo, Screen } from '@/components/ui';
import { SportMotif } from '@/components/viz/SportMotif';
import { spacing } from '@/theme';

/**
 * Any address the app does not know. Replaces Expo Router's default English
 * page (which also linked a sitemap of every route). Same visual language as
 * the welcome screen; entrances follow Reduce Motion.
 */
export default function NotFound() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const big = width < 380 ? 112 : width < 720 ? 140 : 180;

  return (
    <Screen width="form" scroll={false}>
      <Stack.Screen options={{ title: 'Sayfa bulunamadı' }} />
      <SportMotif family="combat" width={Math.min(width, 520)} height={240} opacity={0.22} style={styles.motif} />
      <View style={styles.container} testID="not-found">
        <Animated.View entering={enter(0)}>
          <Logo size="sm" />
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.hero}>
          <AppText variant="hero" color="orange" style={{ fontSize: big, lineHeight: big * 0.92 }} aria-hidden>
            404
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            Bu sayfa sahada yok
          </AppText>
          <AppText variant="body" color="textMuted" style={styles.lead}>
            Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Ana sayfaya dönüp kaldığın yerden devam et.
          </AppText>
        </Animated.View>

        <Animated.View entering={enter(2)} style={styles.actions}>
          <Button label="Ana sayfaya dön" iconRight="arrow-right" onPress={() => router.replace('/')} />
          {router.canGoBack() ? <Button label="Geri dön" variant="secondary" icon="arrow-left" onPress={() => router.back()} /> : null}
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  motif: { position: 'absolute', top: 0, right: 0 },
  container: { flex: 1, justifyContent: 'space-between', paddingTop: spacing.sm, paddingBottom: spacing.lg },
  hero: { gap: spacing.md },
  lead: { maxWidth: 400 },
  actions: { gap: spacing.md },
});
