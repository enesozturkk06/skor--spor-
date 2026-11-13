import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_800ExtraBold_Italic,
} from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/ui';
import { AthleteProvider, useAthlete } from '@/features/athlete/AthleteProvider';
import { ProfileLoadError } from '@/features/athlete/components/ProfileLoadError';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden (e.g. fast refresh) */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_800ExtraBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (fontError) console.warn('[fonts] failed to load, falling back to system fonts', fontError);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AthleteProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AthleteProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function BootScreen() {
  return (
    <View style={styles.boot} accessibilityLabel="Yükleniyor">
      <LogoMark size={64} />
      <ActivityIndicator color={colors.orange} />
    </View>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  const { profile, loading, loadError } = useAthlete();
  const ready = !initializing && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Initial boot keeps the native splash; later loads (e.g. right after sign-in) show a branded loader.
  if (!ready) return initializing ? null : <BootScreen />;

  const signedIn = Boolean(user);
  const onboarded = Boolean(profile);

  // Unknown profile state (offline, nothing cached): never guess between onboarding and dashboard.
  if (signedIn && loadError) return <ProfileLoadError message={loadError} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
      {/* Each group declares where a blocked visitor lands, so deep links resolve predictably. */}
      <Stack.Protected guard={!signedIn} redirectTo={onboarded ? '/' : '/onboarding'}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="verify-email" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>

      {/* Email-link landing page: reachable in every state, it hands over to the guards itself. */}
      <Stack.Screen name="auth/callback" />

      <Stack.Protected guard={signedIn && !onboarded} redirectTo={signedIn ? '/' : '/welcome'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && onboarded} redirectTo={signedIn ? '/onboarding' : '/welcome'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="module/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.bg },
});
