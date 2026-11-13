import { expect, test } from './fixtures';

test.describe('Profil', () => {
  test.beforeEach(async ({ app }) => {
    await app.onboardedUser();
    await app.tab('Profil').click();
  });

  test('onboarding bilgileri profilde görünür', async ({ app, page }) => {
    await expect(app.text('Deniz Kaya')).toBeVisible();
    await expect(page.getByText(/^athlete\d+@example\.com$/)).toBeVisible();
    await expect(page.getByText('23,7', { exact: true })).toBeVisible(); // VKİ: 75 / 1.78²
    for (const chip of ['Fitness', 'Koşu', 'Güç artışı', 'Branş performansı']) {
      await expect(page.getByText(chip, { exact: true }).first()).toBeVisible();
    }
  });

  test('profil düzenleme mevcut verilerle açılır ve kapatınca değişmez', async ({ app }) => {
    await app.button('Profili düzenle').click();
    await expect(app.radio('Boks')).toHaveAttribute('aria-checked', 'true');
    await app.radio('Tenis').click();
    await app.button('Kapat').click();
    await expect(app.text('Deniz Kaya')).toBeVisible();
    await expect(app.page.getByRole('button', { name: 'Profili düzenle' })).toBeVisible();
    await app.tab('Ana Sayfa').click();
    await expect(app.page.getByText('Boks sporcusu')).toBeVisible();
  });

  test('profil düzenleme kaydedilince tüm uygulamaya yansır ve kalıcıdır', async ({ app, page }) => {
    await app.button('Profili düzenle').click();
    await app.completeOnboarding(
      { primary: 'Koşu', extras: [], goals: [], age: '28', height: '180', weight: '81' },
      'Kaydet',
    );
    await expect(page.getByText('25', { exact: true })).toBeVisible(); // VKİ: 81 / 1.80² = 25
    await expect(page.getByText('28 yıl', { exact: true })).toBeVisible();
    // Koşu was a secondary sport; becoming primary removes it from the secondary chips.
    await expect(page.getByLabel('Fitness', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Koşu', { exact: true })).toHaveCount(0);

    await app.tab('Ana Sayfa').click();
    await expect(page.getByText('Koşu sporcusu')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Koşu sporcusu')).toBeVisible();
  });

  test('çıkış yap açılış ekranına döner', async ({ app }) => {
    await app.button('Çıkış yap').click();
    await expect(app.button('Hemen başla')).toBeVisible();
  });
});
