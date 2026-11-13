import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Logo, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { spacing } from '@/theme';

import { useAthlete } from '../AthleteProvider';

/** Signed in, but the profile could not be loaded and nothing is cached. */
export function ProfileLoadError({ message }: { message: string }) {
  const { reload } = useAthlete();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen width="form" scroll={false}>
      <View style={styles.center} accessibilityRole="alert">
        <Logo size="md" />
        <View style={styles.block}>
          <Icon name="cloud-alert-outline" size={44} color="warning" />
          <AppText variant="h2" align="center">
            Profilin yüklenemedi
          </AppText>
          <AppText variant="body" color="textMuted" align="center">
            {message}
          </AppText>
        </View>
        <View style={styles.actions}>
          <Button label="Tekrar dene" icon="refresh" onPress={reload} />
          <Button
            label="Çıkış yap"
            variant="secondary"
            icon="logout"
            loading={signingOut}
            onPress={async () => {
              setSigningOut(true);
              await signOut();
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: spacing.xxxl },
  block: { alignItems: 'center', gap: spacing.md },
  actions: { gap: spacing.md },
});
