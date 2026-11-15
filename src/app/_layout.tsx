import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IconFont } from '@/components/ui/Icon';
import { AthleteProvider, useAthlete } from '@/features/athlete/AthleteProvider';
import { ProfileLoadError } from '@/features/athlete/components/ProfileLoadError';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden (e.g. fast refresh) */
});

export default function RootLayout() {
  // Subset fonts built by `npm run fonts:build` (family names unchanged), plus the
  // icon font so icons never pop in after text.
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold: require('../../assets/fonts/BarlowCondensed_600SemiBold.ttf'),
    BarlowCondensed_700Bold: require('../../assets/fonts/BarlowCondensed_700Bold.ttf'),
    BarlowCondensed_800ExtraBold: require('../../assets/fonts/BarlowCondensed_800ExtraBold.ttf'),
    BarlowCondensed_800ExtraBold_Italic: require('../../assets/fonts/BarlowCondensed_800ExtraBold_Italic.ttf'),
    Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
    ...IconFont.font,
  });

  if (fontError) console.warn('[fonts] failed to load, falling back to system fonts', fontError);
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Every Reanimated animation follows the OS "Reduce Motion" setting. */}
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <SafeAreaProvider>
        <AuthProvider>
          <AthleteProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </AthleteProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  const { profile, loading, loadError } = useAthlete();
  const ready = !initializing && !loading;

  // The native splash only covers session restore; the profile request that
  // follows shows a dashboard skeleton (faster perceived start on slow networks).
  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync().catch(() => {});
  }, [initializing]);

  if (!ready) return initializing ? null : <DashboardSkeleton />;

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
      {/* Dev/E2E-only preview of motion primitives; redirects in production. */}
      <Stack.Screen name="motion-lab" />

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
  root: { flex: 1, backgroundColor: colors.bg },
});
