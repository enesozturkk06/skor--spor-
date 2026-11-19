/**
 * Phase 2A design system, rendered: /design-lab (dev/E2E builds only) shows
 * every new component. Checks what users of assistive technology get and
 * that nothing breaks the phone layout.
 */
import { expect, test } from './fixtures';

test.describe('Tasarım sistemi (2A)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/design-lab');
    await expect(page.getByTestId('lab-sample-note')).toBeVisible({ timeout: 45_000 });
  });

  test('11 özgün branş ikonunun hepsi çizilir', async ({ page }) => {
    for (const id of ['fitness', 'bodybuilding', 'boxing', 'kickboxing', 'karate', 'football', 'basketball', 'volleyball', 'running', 'swimming', 'tennis']) {
      await expect(page.getByTestId(`glyph-sport-${id}`).first()).toBeVisible();
    }
  });

  test('her grafik ve istatistik ekran okuyucuya metin özetiyle duyurulur', async ({ page }) => {
    const expectations: [string, RegExp][] = [
      ['lab-bars', /^Bu hafta antrenman dakikası \(örnek\): Pzt 45 dk, Sal 0 dk, .*Hedef 60 dk\.$/],
      ['lab-trend', /^Tahmini 1RM, bench press \(örnek\): Ağu 82,5 kg, Kas 92,5 kg \(\+10 kg\)\. En yüksek Kas 92,5 kg\.$/],
      ['lab-spark', /^Haftalık seans \(örnek\): 6 değer, en düşük 3, en yüksek 9, son 9\.$/],
      ['lab-stat-1', /^Bu hafta: 185 dk, geçen haftaya göre \+40 dk\.$/],
    ];
    for (const [id, label] of expectations) {
      const el = page.getByTestId(id);
      await expect(el).toHaveAttribute('role', 'img');
      await expect(el).toHaveAttribute('aria-label', label);
    }
    await expect(page.getByRole('progressbar', { name: /^Günlük hedef: 37 dk, hedefin %62$/ })).toBeVisible();
  });

  test('veri yetersizse grafik bunu söyler; nokta uydurmaz', async ({ page }) => {
    await expect(page.getByTestId('lab-spark-empty')).toHaveAttribute('aria-label', 'Yeni egzersiz: yeterli veri yok.');
    await expect(page.getByTestId('lab-trend-empty')).toHaveAttribute('aria-label', 'Yeni egzersiz 1RM: yeterli veri yok.');
    await expect(page.getByTestId('lab-spark-empty').locator('circle')).toHaveCount(0);
  });

  test('rozetler kazanılma durumunu dürüstçe duyurur', async ({ page }) => {
    await expect(page.getByTestId('lab-badge-first_workout')).toHaveAttribute('aria-label', 'Rozet: İlk adım, Bronz, kazanıldı.');
    await expect(page.getByTestId('lab-badge-workouts_10')).toHaveAttribute('aria-label', 'Rozet: Düzenli sporcu, Gümüş, henüz kazanılmadı, ilerleme 5 / 10.');
  });

  test('telefonda yatay taşma yok (360 px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const overflow = await page.evaluate(() => {
      const scroller = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 200 && getComputedStyle(d).overflowY !== 'visible');
      return scroller ? scroller.scrollWidth - scroller.clientWidth : document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
