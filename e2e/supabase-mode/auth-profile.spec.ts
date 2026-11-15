/**
 * Supabase mode, end to end — against the in-browser mock (never the real project).
 * Covers sign-up with email confirmation, sign-in, session persistence and
 * expiry, sign-out, and reading/writing the athlete's own profile row.
 */
import type { Page } from '@playwright/test';

import { DEFAULT_PROFILE } from '../fixtures';

import { PASSWORD, expect, test, uniqueEmail } from './fixtures';

const profileCacheKeys = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('skorspor:profile:')));
const authTokenKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter((k) => /^sb-.*-auth-token$/.test(k)));

test.describe('Supabase modu: kayıt ve e-posta doğrulama', () => {
  test('demo bildirimi görünmez (gerçek mod)', async ({ app }) => {
    await app.openWelcome();
    await expect(app.page.getByText('Demo modu · Veriler yalnızca bu cihazda saklanır')).toHaveCount(0);
    await app.button('Hemen başla').click();
    await expect(app.page.getByText(/Demo modu\./)).toHaveCount(0);
  });

  test('kayıt → doğrulama ekranı; istek doğru alanlarla gider', async ({ app, mock }) => {
    const email = uniqueEmail();
    await app.openSignUp();
    await app.fillSignUp({ name: 'Deniz Kaya', email, password: PASSWORD });
    await app.button('Hesap oluştur').click();

    await expect(app.text('E-postanı doğrula')).toBeVisible();
    await expect(app.page.getByText(email, { exact: true })).toBeVisible();
    const [signup] = mock.calls('POST', '/auth/v1/signup');
    expect(signup.body).toMatchObject({ email, password: PASSWORD, data: { display_name: 'Deniz Kaya' } });
    expect(signup.query.redirect_to).toMatch(/\/auth\/callback$/);
    // No session yet → no onboarding, no profile request.
    await expect(app.text('Ana branşın')).toHaveCount(0);
    expect(mock.calls('GET', '/rest/v1/athlete_profiles')).toHaveLength(0);
  });

  test('doğrulama e-postası 60 sn bekleme ile tekrar gönderilir', async ({ app, mock, page }) => {
    await page.clock.install();
    const email = uniqueEmail();
    await app.openSignUp();
    await app.fillSignUp({ name: 'Deniz Kaya', email, password: PASSWORD });
    await app.button('Hesap oluştur').click();

    const resend = page.getByRole('button', { name: /Tekrar gönder \(\d+ sn\)|Bağlantıyı tekrar gönder/ });
    await expect(resend).toBeDisabled();
    // runFor fires every timer in the window (the countdown re-arms each second).
    await page.clock.runFor(61_000);
    await expect(app.button('Bağlantıyı tekrar gönder')).toBeEnabled();
    await app.button('Bağlantıyı tekrar gönder').click();
    await expect(app.text('Yeni doğrulama bağlantısı gönderildi.')).toBeVisible();
    await expect(resend).toBeDisabled();

    const [call] = mock.calls('POST', '/auth/v1/resend');
    expect(call.body).toMatchObject({ type: 'signup', email });
  });

  test('doğrulanmamış hesapla giriş: açıklama ve yeniden gönderme yolu', async ({ app, mock }) => {
    const email = uniqueEmail();
    mock.addUser({ email, password: PASSWORD, confirmed: false });
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await expect(app.page.getByText(/E-posta adresini henüz doğrulamadın/)).toBeVisible();
    await app.button('Doğrulama e-postasını tekrar gönder').click();
    await expect(app.text('E-postanı doğrula')).toBeVisible();
    await expect(app.page.getByText(email, { exact: true })).toBeVisible();
  });

  test('doğrulama bağlantısı → onboarding → profil sunucuya kaydedilir', async ({ app, mock, page, baseURL }) => {
    const email = uniqueEmail();
    await app.openSignUp();
    await app.fillSignUp({ name: 'Deniz Kaya', email, password: PASSWORD });
    await app.button('Hesap oluştur').click();
    await expect(app.text('E-postanı doğrula')).toBeVisible();

    await page.goto(mock.confirmationLink(email, baseURL!));
    await app.startOnboarding();
    expect(page.url(), 'tokens must be removed from the address bar').not.toMatch(/access_token|refresh_token/);

    await app.completeOnboarding(DEFAULT_PROFILE);
    await app.expectDashboard();

    const user = mock.users.get(email)!;
    const row = mock.profiles.get(user.id)!;
    expect(row).toMatchObject({
      user_id: user.id,
      primary_sport: 'boxing',
      secondary_sports: ['fitness', 'running'],
      goals: ['strength', 'performance'],
      age: 27,
      height_cm: 178,
      weight_kg: 75,
    });
    const [write] = mock.calls('POST', '/rest/v1/athlete_profiles');
    expect(write.query.on_conflict).toBe('user_id');
    expect(write.body, 'timestamps are server-managed and never sent').not.toHaveProperty('created_at');
    expect(write.body).not.toHaveProperty('updated_at');
  });

  test('süresi dolmuş doğrulama bağlantısı anlaşılır hata gösterir', async ({ app, page, baseURL }) => {
    await page.goto(`${baseURL}/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
    await expect(app.text('Bağlantı kullanılamadı')).toBeVisible();
    await expect(page.getByText(/süresi dolmuş/)).toBeVisible();
    await app.button('Giriş yap').click();
    await expect(app.text('Tekrar hoş geldin')).toBeVisible();
  });
});

test.describe('Supabase modu: giriş, oturum ve profil', () => {
  test('hatalı şifre anlaşılır mesaj verir', async ({ app, mock }) => {
    const email = uniqueEmail();
    mock.addUser({ email, password: PASSWORD });
    await app.openSignIn();
    await app.signIn(email, 'yanlis1234');
    await expect(app.text('E-posta veya şifre hatalı.')).toBeVisible();
  });

  test('profili olan sporcu doğrudan dashboard açar; yenilemede oturum doğrulanır', async ({ app, mock, page }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    mock.addProfile(user.id, { primary_sport: 'tennis', secondary_sports: [] });
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();
    await expect(page.getByText('Tenis sporcusu')).toBeVisible();

    const userChecksBefore = mock.calls('GET', '/auth/v1/user').length;
    await page.reload();
    await app.expectDashboard();
    expect(mock.calls('GET', '/auth/v1/user').length, 'session verified with the server on start').toBeGreaterThan(userChecksBefore);
    await expect(app.text('Ana branşın')).toHaveCount(0);
  });

  test('profil düzenleme sunucuya yazılır; created_at korunur', async ({ app, mock, page }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    const original = mock.addProfile(user.id);
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();

    await app.tab('Profil').click();
    await app.button('Profili düzenle').click();
    await app.completeOnboarding({ primary: 'Koşu', extras: [], goals: [], age: '30', height: '181', weight: '79,5' }, 'Kaydet');
    await expect(page.getByText('30 yıl', { exact: true })).toBeVisible();

    const row = mock.profiles.get(user.id)!;
    expect(row).toMatchObject({ primary_sport: 'running', age: 30, height_cm: 181, weight_kg: 79.5 });
    expect(row.created_at).toBe(original.created_at);
    expect(row.updated_at > original.updated_at).toBe(true);
  });

  test('kaydetme hatası kullanıcıya gösterilir, veri kaybolmaz ve tekrar denenebilir', async ({ app, mock, page, baseURL }) => {
    const email = uniqueEmail();
    mock.addUser({ email, password: PASSWORD, confirmed: false });
    await page.goto(mock.confirmationLink(email, baseURL!));
    await app.startOnboarding();

    mock.profileWrites = 'server';
    await app.completeOnboarding();
    await expect(app.text('Profil kaydedilemedi. Lütfen tekrar dene.')).toBeVisible();
    // Still on the athlete card with every answer kept; the retry is one tap.
    await expect(app.text('Sporcu kartın hazır')).toBeVisible();
    await expect(app.text('Boks')).toBeVisible(); // sport name is an uppercase heading on the card

    mock.profileWrites = 'network';
    await app.button('Profili oluştur').click();
    await expect(page.getByText(/Bağlantı hatası\. Profil kaydedilemedi/)).toBeVisible();

    mock.profileWrites = 'none';
    await app.button('Profili oluştur').click();
    await app.expectDashboard();
    expect(mock.profiles.get(mock.users.get(email)!.id)).toBeTruthy();
  });

  test('profil yüklenemezse (önbellek yok) hata ekranı ve tekrar dene', async ({ app, mock }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    mock.addProfile(user.id);
    mock.profileReads = 'network';
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await expect(app.text('Profilin yüklenemedi')).toBeVisible();
    // Never guesses: no onboarding, no dashboard while the state is unknown.
    await expect(app.text('Ana branşın')).toHaveCount(0);

    mock.profileReads = 'none';
    await app.button('Tekrar dene').click();
    await app.expectDashboard();
  });

  test('sunucuya ulaşılamazsa cihazdaki son profil uyarıyla gösterilir', async ({ app, mock, page }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    mock.addProfile(user.id);
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();

    mock.profileReads = 'network';
    await page.reload();
    await app.expectDashboard();
    await expect(page.getByText(/Sunucuya ulaşılamıyor/)).toBeVisible();

    mock.profileReads = 'none';
    await app.button('Yeniden bağlan').click();
    await expect(page.getByText(/Sunucuya ulaşılamıyor/)).toHaveCount(0);
  });

  test('profil isteği yetkisiz reddedilirse önbellek gösterilmez', async ({ app, mock, page }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    mock.addProfile(user.id);
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();

    mock.profileReads = 'unauthorized';
    await page.reload();
    await expect(app.text('Profilin yüklenemedi')).toBeVisible();
    await expect(page.getByText('Oturumun sona ermiş olabilir. Lütfen tekrar giriş yap.')).toBeVisible();
    await expect(page.getByText(/Sunucuya ulaşılamıyor/), 'a rejected session is not "offline"').toHaveCount(0);
    expect(await profileCacheKeys(page)).toHaveLength(0);
  });

  test('sunucuda iptal edilen oturum: süresi doldu bildirimi ve önbellek temizliği', async ({ app, mock, page }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    mock.addProfile(user.id);
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();
    expect(await profileCacheKeys(page)).toHaveLength(1);

    mock.revokeAllSessions();
    await page.reload();
    await expect(app.button('Hemen başla')).toBeVisible();
    await expect(page.getByText(/Oturumunun süresi doldu/)).toBeVisible();
    expect(await authTokenKeys(page)).toHaveLength(0);
    expect(await profileCacheKeys(page)).toHaveLength(0);

    await app.button('Bildirimi kapat').click();
    await expect(page.getByText(/Oturumunun süresi doldu/)).toHaveCount(0);
  });

  test('çıkış: sunucuya bildirilir, cihazda oturum ve profil kalmaz', async ({ app, mock, page }) => {
    const email = uniqueEmail();
    const user = mock.addUser({ email, password: PASSWORD });
    mock.addProfile(user.id);
    await app.openSignIn();
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();

    await app.signOut();
    expect(mock.calls('POST', '/auth/v1/logout')).toHaveLength(1);
    expect(await authTokenKeys(page)).toHaveLength(0);
    expect(await profileCacheKeys(page)).toHaveLength(0);
    // A deliberate sign-out is not an "expired session".
    await expect(page.getByText(/Oturumunun süresi doldu/)).toHaveCount(0);

    await page.reload();
    await expect(app.button('Hemen başla')).toBeVisible();
  });
});

test.describe('Mod ayrımı', () => {
  test('cihazdaki demo oturumu Supabase build’ini etkilemez', async ({ app, page }) => {
    await page.addInitScript(() => {
      const demoUser = { id: 'demo-leftover', email: 'demo@example.com', displayName: 'Demo Kullanıcı' };
      localStorage.setItem('skorspor:demo:session', JSON.stringify(demoUser));
      localStorage.setItem('skorspor:profile:demo:demo-leftover', JSON.stringify({ primarySport: 'boxing', age: 30, heightCm: 180, weightKg: 80 }));
    });
    await app.openWelcome();
    await expect(app.text('Athlete Score')).toHaveCount(0);
    await expect(page.getByText('Demo Kullanıcı')).toHaveCount(0);
  });
});
