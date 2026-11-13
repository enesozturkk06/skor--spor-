import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Logo, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, spacing } from '@/theme';

type State = { kind: 'working' } | { kind: 'error'; message: string };

/**
 * The URL that opened this screen (web: the address bar, native: the deep link).
 * Web captures it once on mount: the screen itself strips the tokens from the
 * address bar afterwards, and a later re-read must not replace the payload.
 */
function useCallbackUrl(): string | null {
  const native = Linking.useLinkingURL();
  const [webUrl] = useState(() => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : null));
  return Platform.OS === 'web' ? webUrl : native;
}

/**
 * Landing page for email confirmation links. Completes the sign-in, then
 * hands over to the root guards (onboarding or dashboard).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, completeEmailLink } = useAuth();
  const url = useCallbackUrl();
  const handled = useRef<string | null>(null);
  const [state, setState] = useState<State>({ kind: 'working' });

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;

    // Don't leave tokens in the address bar / browser history.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && /[#?]/.test(window.location.href)) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const hasPayload = /[#?&](access_token|code|error|error_description)=/.test(url);
    if (!hasPayload) {
      // Opened without a link payload (e.g. reload after success).
      if (user) router.replace('/');
      else void Promise.resolve().then(() => setState({ kind: 'error', message: 'Doğrulama bağlantısı bulunamadı.' }));
      return;
    }

    completeEmailLink(url).then((result) => {
      if (result.ok) router.replace('/');
      else setState({ kind: 'error', message: result.error });
    });
  }, [url, user, completeEmailLink, router]);

  return (
    <Screen width="form" scroll={false}>
      <View style={styles.center}>
        <Logo size="md" />
        {state.kind === 'working' ? (
          <View style={styles.block} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.orange} />
            <AppText variant="body" color="textMuted" align="center">
              E-posta adresin doğrulanıyor…
            </AppText>
          </View>
        ) : (
          <View style={styles.block} accessibilityRole="alert">
            <Icon name="link-variant-off" size={40} color="danger" />
            <AppText variant="h2" align="center">
              Bağlantı kullanılamadı
            </AppText>
            <AppText variant="body" color="textMuted" align="center">
              {state.message}
            </AppText>
            <AppText variant="small" color="textFaint" align="center">
              Giriş yapmayı dene; hesabın henüz doğrulanmadıysa oradan yeni bağlantı isteyebilirsin.
            </AppText>
            <Button label="Giriş yap" iconRight="arrow-right" onPress={() => router.replace('/sign-in')} style={styles.cta} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxxl },
  block: { alignItems: 'center', gap: spacing.md, width: '100%' },
  cta: { alignSelf: 'stretch', marginTop: spacing.md },
});
