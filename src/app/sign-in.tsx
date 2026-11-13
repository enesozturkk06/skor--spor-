import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import { AppText, Button, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { FormError } from '@/features/auth/components/FormError';
import { SessionExpiredNotice } from '@/features/auth/components/SessionExpiredNotice';
import { validate } from '@/lib/validation';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const passwordRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    const next = { email: validate.email(email), password: password ? null : 'Şifre gerekli.' };
    setErrors(next);
    setFormError(null);
    setUnconfirmed(false);
    if (next.email || next.password) return;

    setSubmitting(true);
    const result = await signIn(email, password);
    // On success the root navigator re-routes automatically via its guards.
    if (!result.ok) {
      setFormError(result.error);
      setUnconfirmed(result.code === 'email_not_confirmed');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Tekrar hoş geldin"
      subtitle="Performansını kaldığın yerden takip et."
      footer={
        <AppText variant="small" color="textMuted">
          Hesabın yok mu?{' '}
          <AppText variant="smallStrong" color="orange" accessibilityRole="link" onPress={() => router.replace('/sign-up')}>
            Kayıt ol
          </AppText>
        </AppText>
      }
    >
      <SessionExpiredNotice />
      <FormError message={formError} />
      {unconfirmed ? (
        <Button
          label="Doğrulama e-postasını tekrar gönder"
          variant="secondary"
          icon="email-sync-outline"
          size="md"
          onPress={() => router.push({ pathname: '/verify-email', params: { email: email.trim() } })}
        />
      ) : null}
      <TextField
        label="E-posta"
        icon="email-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@mail.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
      />
      <TextField
        ref={passwordRef}
        label="Şifre"
        icon="lock-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        secureToggle
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
      />
      <Button label="Giriş yap" iconRight="arrow-right" loading={submitting} onPress={submit} />
    </AuthShell>
  );
}
