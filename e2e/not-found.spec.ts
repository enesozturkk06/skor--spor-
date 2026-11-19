/**
 * Unknown addresses get SKOR SPOR's own Turkish page — never Expo's English
 * "Unmatched Route" page with its sitemap of every internal route.
 */
import { expect, test } from './fixtures';

test.describe('Bulunamayan sayfa (404)', () => {
  test('Türkçe ve markalı; rota listesi yok; ana sayfaya döndürür', async ({ page, app }) => {
    await page.goto('/olmayan-sayfa');
    await expect(page.getByTestId('not-found')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Bu sayfa sahada yok' })).toBeVisible();
    await expect(page.getByText('Unmatched Route')).toHaveCount(0);
    await expect(page.getByText('Sitemap')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /sitemap/i })).toHaveCount(0);

    await app.button('Ana sayfaya dön').click();
    // Signed out: "/" leads to the welcome screen.
    await expect(app.button('Hemen başla')).toBeVisible();
  });

  test('derin bir yanlış adres de aynı sayfayı gösterir', async ({ page }) => {
    await page.goto('/programlar/yok/123');
    await expect(page.getByTestId('not-found')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Bu sayfa sahada yok' })).toBeVisible();
  });
});
