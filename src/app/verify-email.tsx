import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Icon } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { FormError } from '@/features/auth/components/FormError';
import { validate } from '@/lib/validation';
import { colors, radius, spacing } from '@/theme';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { resendConfirmation } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  // Only use a well-formed address from the URL; never echo arbitrary input.
  const email = typeof params.email === 'string' && !validate.email(params.email) ? params.email.trim() : null;

  // Deadline-based, so the countdown stays correct when timers are throttled
  // (app in background, slow device) instead of drifting tick by tick.
  const [availableAt, setAvailableAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null);
  const cooldown = Math.max(0, Math.ceil((availableAt - now) / 1000));
  const startCooldown = () => {
    const t = Date.now();
    setNow(t);
    setAvailableAt(t + RESEND_COOLDOWN_SECONDS * 1000);
  };

  useEffect(() => {
    if (availableAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [availableAt]);

  const resend = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    setMessage(null);
    const result = await resendConfirmation(email);
    setSending(false);
    if (result.ok) {
      setMessage({ text: 'Yeni doğrulama bağlantısı gönderildi.', tone: 'success' });
      startCooldown();
    } else {
      setMessage({ text: result.error, tone: 'danger' });
      if (result.code === 'rate_limited') startCooldown();
    }
  };

  return (
    <AuthShell
      title="E-postanı doğrula"
      subtitle="Hesabını etkinleştirmek için sana bir doğrulama bağlantısı gönderdik."
      footer={
        <AppText variant="small" color="textMuted">
          Farklı bir e-posta mı kullanacaksın?{' '}
          <AppText variant="smallStrong" color="orange" accessibilityRole="link" onPress={() => router.replace('/sign-up')}>
            Yeniden kayıt ol
          </AppText>
        </AppText>
      }
    >
      <Card variant="outline">
        <View style={styles.row}>
          <View style={styles.icon}>
            <Icon name="email-check-outline" size={26} color="gold" />
          </View>
          <View style={styles.text}>
            <AppText variant="overline" color="textMuted">
              Gönderilen adres
            </AppText>
            <AppText variant="title" numberOfLines={1} accessibilityLabel={email ? `Gönderilen adres ${email}` : undefined}>
              {email ?? 'Kayıt olduğun e-posta adresi'}
            </AppText>
          </View>
        </View>
        <AppText variant="small" color="textMuted" style={styles.hint}>
          Bağlantıya tıkladıktan sonra uygulama seni otomatik olarak içeri alır. E-posta gelmediyse spam / gereksiz klasörünü kontrol et.
        </AppText>
      </Card>

      {message ? <FormError message={message.text} tone={message.tone} /> : null}

      {email ? (
        <Button
          label={cooldown > 0 ? `Tekrar gönder (${cooldown} sn)` : 'Bağlantıyı tekrar gönder'}
          variant="secondary"
          icon="email-sync-outline"
          disabled={cooldown > 0}
          loading={sending}
          onPress={resend}
        />
      ) : null}
      <Button label="Doğruladım, giriş yap" iconRight="arrow-right" onPress={() => router.replace('/sign-in')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  text: { flex: 1, gap: spacing.xxs },
  hint: { marginTop: spacing.md },
});
