import { expect, makeUser, test } from './fixtures';

test.describe('Açılış ekranı', () => {
  test('marka, slogan ve giriş/kayıt butonları görünür', async ({ app, page }) => {
    await app.openWelcome();
    await expect(page.getByRole('heading', { name: 'SKOR SPOR' })).toBeVisible();
    await expect(app.text('performance.')).toBeVisible();
    await expect(app.button('Giriş yap')).toBeVisible();
    await expect(app.text('Demo modu · Veriler yalnızca bu cihazda saklanır')).toBeVisible();
  });
});

test.describe('Kayıt ol', () => {
  test('boş form gönderildiğinde tüm alan hataları gösterilir', async ({ app }) => {
    await app.openSignUp();
    await app.button('Hesap oluştur').click();
    await expect(app.text('Adınızı girin.')).toBeVisible();
    await expect(app.text('E-posta gerekli.')).toBeVisible();
    await expect(app.text('Şifre gerekli.')).toBeVisible();
  });

  test('geçersiz e-posta ve zayıf şifre reddedilir', async ({ app }) => {
    await app.openSignUp();
    await app.field('Ad Soyad').fill('Deniz');
    await app.field('E-posta').fill('deniz@eksik');
    await app.field('Şifre').fill('kisa1');
    await app.button('Hesap oluştur').click();
    await expect(app.text('Geçerli bir e-posta girin.')).toBeVisible();
    await expect(app.text('Şifre en az 8 karakter olmalı.')).toBeVisible();

    await app.field('Şifre').fill('sadeceharf');
    await app.button('Hesap oluştur').click();
    await expect(app.text('Şifre harf ve rakam içermeli.')).toBeVisible();
    // Still on sign-up: nothing was created.
    await expect(app.button('Hesap oluştur')).toBeVisible();
  });

  test('şifre göster/gizle düğmesi çalışır', async ({ app }) => {
    await app.openSignUp();
    const password = app.field('Şifre');
    await expect(password).toHaveAttribute('type', 'password');
    await app.button('Şifreyi göster').click();
    await expect(password).not.toHaveAttribute('type', 'password');
    await app.button('Şifreyi gizle').click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('geçerli kayıt onboarding ekranını açar', async ({ app }) => {
    await app.signUp(makeUser());
    await expect(app.text('01')).toBeVisible();
  });

  test('aynı e-posta ile ikinci kayıt engellenir', async ({ app }) => {
    const user = await app.onboardedUser();
    await app.signOut();
    await app.openSignUp();
    await app.fillSignUp(user);
    await app.button('Hesap oluştur').click();
    await expect(app.text('Bu e-posta ile zaten bir hesap var.')).toBeVisible();
  });
});

test.describe('Giriş yap ve çıkış', () => {
  test('boş form ve kayıtsız hesap için hata verir', async ({ app }) => {
    await app.openSignIn();
    await app.signInSubmit().click();
    await expect(app.text('E-posta gerekli.')).toBeVisible();
    await expect(app.text('Şifre gerekli.')).toBeVisible();

    await app.signIn('kayitsiz@example.com', 'guclu1234');
    await expect(app.page.getByText(/kayıtlı demo hesabı yok/)).toBeVisible();
  });

  test('çıkış yapan kullanıcı tekrar giriş yapınca doğrudan dashboard açılır', async ({ app }) => {
    const user = await app.onboardedUser();
    await app.signOut();
    await app.button('Giriş yap').click();
    await app.signIn(user.email, user.password);
    await app.expectDashboard();
    // Onboarding is not repeated for an athlete who already has a profile.
    await expect(app.text('Ana branşın')).toHaveCount(0);
  });
});

test.describe('Oturum kalıcılığı', () => {
  test('sayfa yenilendiğinde oturum ve profil korunur', async ({ app, page }) => {
    await app.onboardedUser();
    await page.reload();
    await app.expectDashboard();
    await expect(page.getByText('Boks sporcusu')).toBeVisible();
  });

  test('çıkış yapıldıktan sonra yenileme oturumu geri getirmez', async ({ app, page }) => {
    await app.onboardedUser();
    await app.signOut();
    await page.reload();
    await expect(app.button('Hemen başla')).toBeVisible();
    await expect(app.text('Athlete Score')).toHaveCount(0);
  });

  test('onboarding yarıda kalırsa yenilemeden sonra onboarding devam eder', async ({ app, page }) => {
    await app.signUp(makeUser());
    await app.radio('Boks').click();
    await page.reload();
    await expect(app.text('Ana branşın')).toBeVisible();
    await expect(app.text('Athlete Score')).toHaveCount(0);
  });
});
