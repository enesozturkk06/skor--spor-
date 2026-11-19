/**
 * First impression on the web: the browser draws the branded start screen
 * (public/index.html #skor-shell) before any JavaScript runs, fonts never
 * block the app, and the start screen gives way once the app is ready.
 */
import { test as base } from '@playwright/test';

import { expect, test } from './fixtures';

const SHELL = '#skor-shell';

base.describe('Açılış ekranı (JavaScript olmadan)', () => {
  base('uygulama kodu gelmeden koyu, markalı ilk ekran ve slogan görünür', async ({ page }) => {
    // Simulates the app scripts still downloading: the HTML alone must look right.
    await page.route('**/_expo/static/js/**', (route) => route.abort());
    await page.goto('/');
    const shell = page.locator(SHELL);
    await expect(shell).toBeVisible();
    await expect(shell.locator('.ss-slogan')).toHaveText(/OWN YOUR\s*PERFORMANCE\./);
    await expect(shell.locator('.ss-word')).toHaveText(/SKOR\s+SPOR/);
    // Never a white first frame.
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(8, 13, 13)');
    // Decorative only: it can never take a tap meant for the app.
    expect(await shell.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    expect(await shell.getAttribute('aria-hidden')).toBe('true');
  });

  base('Reduce Motion açıkken ilk ekranda animasyon yok', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/_expo/static/js/**', (route) => route.abort());
    await page.goto('/');
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('#skor-shell, #skor-shell *')].map((el) => getComputedStyle(el).animationName).filter((n) => n !== 'none'),
    );
    expect(names).toEqual([]);
  });
});

test.describe('Açılış ekranı → uygulama', () => {
  test('uygulama hazır olunca ilk ekran kalkar ve karşılama ekranı kullanılabilir (konsol hatası yok)', async ({ page, app }) => {
    await app.openWelcome();
    await expect(page.locator(SHELL)).toHaveCount(0);
    await app.button('Hemen başla').click();
    await expect(app.button('Hesap oluştur')).toBeVisible();
  });

  test('metin fontları gecikse de uygulama açılır (font beklenmez)', async ({ page, app }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    // Hold back every text font (the tiny icon font still arrives).
    await page.route(/\/fonts\/(Inter|BarlowCondensed)_[^/]+\.woff2$/, async (route) => {
      await gate;
      await route.continue();
    });
    // Not app.openWelcome(): the page "load" event itself waits for preloaded fonts.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(app.button('Hemen başla')).toBeVisible({ timeout: 45_000 });
    expect(await page.evaluate(() => document.fonts.check('16px Inter_400Regular')), 'rendered before the text font arrived').toBe(false);
    release();
    await expect.poll(() => page.evaluate(() => document.fonts.check('16px Inter_400Regular'))).toBe(true);
  });
});
