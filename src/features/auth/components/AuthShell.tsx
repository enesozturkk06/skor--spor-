import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, Logo, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { useAuth } from '../AuthProvider';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const router = useRouter();
  const { mode } = useAuth();

  return (
    <Screen width="form">
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <Logo size="sm" />
        <View style={styles.back} />
      </View>

      <View style={styles.head}>
        <AppText variant="display" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" color="textMuted">
          {subtitle}
        </AppText>
      </View>

      {mode === 'demo' ? (
        <View style={styles.demo} accessibilityRole="alert">
          <Icon name="flask-outline" size={16} color="gold" />
          <AppText variant="small" color="textMuted" style={styles.flex}>
            <AppText variant="smallStrong" color="gold">
              Demo modu.{' '}
            </AppText>
            Sunucu bağlantısı henüz yapılandırılmadı. Hesap bilgileri yalnızca bu cihazda tutulur, şifre saklanmaz.
          </AppText>
        </View>
      ) : null}

      <View style={styles.form}>{children}</View>
      <View style={styles.footer}>{footer}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xxxl },
  back: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  head: { gap: spacing.sm, marginBottom: spacing.xxl },
  demo: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xxl,
  },
  flex: { flex: 1 },
  form: { gap: spacing.xl },
  footer: { marginTop: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
