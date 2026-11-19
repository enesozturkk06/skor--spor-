import { expect, test, upperAlternatives } from './fixtures';

test.describe('Ana sayfa dashboard', () => {
  test.beforeEach(async ({ app }) => {
    await app.onboardedUser();
  });

  test('karşılama alanı kullanıcı adını ve ana branşı gösterir', async ({ app, page }) => {
    const greetings = upperAlternatives(['İyi geceler', 'Günaydın', 'İyi günler', 'İyi akşamlar']);
    await expect(page.getByText(new RegExp(`^(${greetings}), DENİZ$`))).toBeVisible();
    await expect(page.getByText('Boks sporcusu')).toBeVisible();
    await expect(app.button('Profili aç')).toBeVisible();
  });

  test('tüm dashboard bölümleri görünür', async ({ app, page }) => {
    for (const t of ['Athlete Score', 'Hedef', 'Seri', 'Haftalık aktivite', 'Antrenman', 'Beslenme', 'Recovery', 'Hızlı erişim', 'Own your performance.']) {
      await expect(app.text(t), t).toBeAttached();
    }
    // Real data only (Phase 3E): the score explains its basis instead of a sample-data banner.
    await expect(app.button('Skor neye dayanıyor?')).toBeVisible();
    await expect(page.getByText('Örnek veri.')).toHaveCount(0);
  });

  test('hızlı erişim kartı modül önizlemesini açar ve geri döner', async ({ app, page }) => {
    await page.getByRole('button', { name: /^Recovery,/ }).click();
    await expect(app.text('Bu modülde neler olacak')).toBeVisible();
    await app.button('Geri').click();
    await app.expectDashboard();
  });

  test('çalışan modüller "Yakında" ya da "Geliştiriliyor" olarak gösterilmez (K1)', async ({ app, page }) => {
    // Quick access: live modules carry no "coming soon" tag; modules in development still do.
    const tile = (name: RegExp) => page.getByRole('button', { name });
    await expect(tile(/^Antrenman,/)).toBeVisible();
    await expect(tile(/^Antrenman,/).getByText(/^(Yakında|YAKINDA)$/)).toHaveCount(0);
    await expect(tile(/^Egzersiz Kütüphanesi,/).getByText(/^(Yakında|YAKINDA)$/)).toHaveCount(0);
    await expect(tile(/^Recovery,/).getByText(/^(Yakında|YAKINDA)$/)).toHaveCount(1);

    // Training tab: the working screens only — no roadmap card for features that already exist.
    await app.tab('Antrenman').click();
    await expect(app.text('Antrenmana başla')).toBeVisible();
    await expect(app.text('Bu modülde neler olacak').filter({ visible: true })).toHaveCount(0);
    await expect(app.text('Geliştiriliyor').filter({ visible: true })).toHaveCount(0);
  });

  test('alt menüdeki tüm sekmeler açılır', async ({ app }) => {
    const tabs: [string, string][] = [
      ['Antrenman', 'Antrenmana başla'],
      ['AI Koç', 'Kişisel performans asistanı'],
      ['Beslenme', 'Kalori ve makro takibi'],
      ['Profil', 'Profili düzenle'],
      ['Ana Sayfa', 'Athlete Score'],
    ];
    for (const [tab, marker] of tabs) {
      await app.tab(tab).click();
      await expect(app.tab(tab)).toHaveAttribute('aria-selected', 'true');
      await expect(app.text(marker), `${tab} sekmesi`).toBeVisible();
    }
  });
});
