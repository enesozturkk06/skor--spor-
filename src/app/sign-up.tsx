import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import { AppText, Button, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { AuthSwitch } from '@/features/auth/components/AuthSwitch';
import { FormError } from '@/features/auth/components/FormError';
import { validate } from '@/lib/validation';

type Errors = { name?: string | null; email?: string | null; password?: string | null };

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    const next: Errors = { name: validate.name(name), email: validate.email(email), password: validate.password(password) };
    setErrors(next);
    setFormError(null);
    if (next.name || next.email || next.password) return;

    setSubmitting(true);
    const result = await signUp(name, email, password);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error);
    } else if (result.needsEmailConfirmation) {
      router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
    }
    // Successful sign-up with a session → guards route to onboarding.
  };

  return (
    <AuthShell
      title="Sporcu hesabı oluştur"
      subtitle="Birkaç adımda sana özel performans panelini kuralım."
      footer={
        <>
          <AuthSwitch prompt="Zaten hesabın var mı?" action="Giriş yap" onPress={() => router.replace('/sign-in')} />
          <AppText variant="small" color="textFaint" align="center">
            Devam ederek Kullanım Koşulları ve Gizlilik Politikası&apos;nı kabul etmiş olursun.
          </AppText>
        </>
      }
    >
      <FormError message={formError} />
      <TextField
        label="Ad Soyad"
        icon="account-outline"
        value={name}
        onChangeText={setName}
        placeholder="Adın"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={40}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        error={errors.name}
      />
      <TextField
        ref={emailRef}
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
        placeholder="En az 8 karakter, harf + rakam"
        secureTextEntry
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
      />
      <Button label="Hesap oluştur" iconRight="arrow-right" loading={submitting} onPress={submit} />
    </AuthShell>
  );
}
