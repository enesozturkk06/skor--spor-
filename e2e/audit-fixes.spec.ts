/**
 * Regression tests for the pre-2C audit fixes: touch targets (Y4), Turkish
 * page language and casing (O1), screen-reader names without icon glyphs (O2),
 * the narrow-phone greeting (O3) and the exercise filter chips (O5).
 */
import type { Locator, Page } from '@playwright/test';

import { expect, makeUser, test } from './fixtures';

const MIN_TOUCH = 44;

async function expectTouchTarget(target: Locator, what: string) {
  await expect(target, what).toBeVisible();
  const box = await target.boundingBox();
  expect(box, what).not.toBeNull();
  expect(Math.round(box!.width), `${what} width`).toBeGreaterThanOrEqual(MIN_TOUCH);
  expect(Math.round(box!.height), `${what} height`).toBeGreaterThanOrEqual(MIN_TOUCH);
}

/** Private-use code points: where icon-font glyphs live (MDI uses U+F0000+). */
const PRIVATE_USE = /[\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/u;

async function expectNoGlyphsInNames(page: Page, where: string) {
  const tree = await page.locator('body').ariaSnapshot();
  const bad = tree.split('\n').filter((l) => PRIVATE_USE.test(l));
  expect(bad, `${where}: icon glyphs in accessible names`).toEqual([]);
}

test.describe('Dokunma alanları en az 44×44 (Y4)', () => {
  test('giriş ve kayıt ekranları: şifre göster, geri, Kayıt ol / Giriş yap bağlantıları', async ({ app, page }) => {
    await app.openSignIn();
    await expectTouchTarget(page.getByRole('button', { name: 'Şifreyi göster' }), 'Şifreyi göster');
    await expectTouchTarget(page.getByRole('link', { name: 'Kayıt ol' }), 'Kayıt ol');
    await expectTouchTarget(app.button('Geri').filter({ visible: true }).first(), 'Geri');
    await page.getByRole('link', { name: 'Kayıt ol' }).click();
    await expect(app.button('Hesap oluştur')).toBeVisible();
    await expectTouchTarget(page.getByRole('link', { name: 'Giriş yap' }), 'Giriş yap');
  });

  test('ana sayfa: Geçmiş, Yenile ve profil düğmeleri; kütüphane filtre denetimleri', async ({ app, page }) => {
    await app.onboardedUser();
    await expectTouchTarget(app.button('Geçmiş'), 'Geçmiş');
    await expectTouchTarget(app.button('Yenile'), 'Yenile');
    await expectTouchTarget(app.button('Profili aç'), 'Profili aç');

    await page.goto('/exercises');
    await page.getByRole('checkbox', { name: 'Göğüs', exact: true }).click();
    await expectTouchTarget(app.button('Filtreleri temizle'), 'Filtreleri temizle');
  });
});

test.describe('Türkçe sayfa dili ve harfler (O1)', () => {
  test('sayfa dili tr; büyük harfler Türkçe kurallarla (i→İ, ı→I) ve CSS dönüşümü kapalı', async ({ app, page }) => {
    await app.openWelcome();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    const label = app.button('Giriş yap').getByText(/GİRİŞ YAP/);
    await expect(label).toHaveText('GİRİŞ YAP'); // dotted İ, not "GIRIŞ"
    expect(await label.evaluate((el) => getComputedStyle(el).textTransform)).toBe('none');

    await app.signUp(makeUser());
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await page.getByRole('button', { name: /^(Devam et|Bu adımı atla)$/ }).click();
    await app.checkbox('Güç artışı').click();
    await app.button('Devam et').click();
    await app.field('Yaş').fill('27');
    await app.field('Boy').fill('178');
    await app.field('Kilo').fill('75');
    await app.button('Devam et').click();
    // "kartın hazır" → dotless I; "sporcu" stays without dots.
    await expect(page.getByText('SPORCU KARTIN HAZIR', { exact: true })).toBeVisible();
  });
});

test.describe('Ekran okuyucu isimleri ikon karakteri içermez (O2)', () => {
  test('giriş, ana sayfa, antrenman, kütüphane ve profil', async ({ app, page }) => {
    await app.openSignIn();
    await expectNoGlyphsInNames(page, 'giriş');
    await app.page.goto('/');
    await app.onboardedUser();
    await expectNoGlyphsInNames(page, 'ana sayfa');
    await expect(app.button('Geçmiş')).toBeVisible(); // exactly "Geçmiş", no chevron glyph
    for (const [route, where] of [['/training', 'antrenman'], ['/exercises', 'kütüphane'], ['/profile', 'profil']] as const) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expectNoGlyphsInNames(page, where);
    }
  });
});

test.describe('Dar telefonda selamlama (O3)', () => {
  for (const name of ['Deniz Kaya', 'Konstantinos Papadopoulos']) {
    test(`360 px: "${name.split(' ')[0]}" kesilmeden görünür`, async ({ app, page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await app.onboardedUser(makeUser({ name }));
      const greeting = page.getByTestId('dashboard-greeting').filter({ visible: true });
      await expect(greeting).toContainText(name.split(' ')[0].toLocaleUpperCase('tr-TR'));
      // Clamped text hides lines: lift the clamp and compare heights (glyph overhang like the İ dot is not clipping).
      const clipped = await greeting.evaluate((el) => {
        const h = el.getBoundingClientRect().height;
        const s = (el as HTMLElement).style;
        const prev = [s.webkitLineClamp, s.maxHeight, s.overflow];
        s.webkitLineClamp = 'unset';
        s.maxHeight = 'none';
        s.overflow = 'visible';
        const full = el.getBoundingClientRect().height;
        [s.webkitLineClamp, s.maxHeight, s.overflow] = prev;
        return full > h + 1;
      });
      expect(clipped, 'greeting is cut off').toBe(false);
    });
  }
});

test.describe('Egzersiz filtre çipleri (O5)', () => {
  test('masaüstünde çipler satıra sarılır, hiçbiri kesilmez', async ({ app, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await app.onboardedUser();
    await page.goto('/exercises');
    const chips = page.getByRole('checkbox', { name: 'Göğüs', exact: true });
    await expect(chips.first()).toBeVisible();
    const clipped = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll('[role="checkbox"]')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (s.overflowX === 'hidden' || s.overflowX === 'auto' || s.overflowX === 'scroll') {
            const pr = p.getBoundingClientRect();
            if (r.right > pr.right + 1 || r.left < pr.left - 1) out.push((el as HTMLElement).innerText.trim());
            break;
          }
        }
      }
      return out;
    });
    expect(clipped, 'chips cut off at a container edge').toEqual([]);
    await expect(page.getByTestId('chip-scroll-hint')).toHaveCount(0);
  });

  test('telefonda kaydırma ipucu görünür, sona kaydırınca kaybolur', async ({ app, page }) => {
    await app.onboardedUser();
    await page.goto('/exercises');
    const hint = page.getByTestId('chip-scroll-hint').first();
    await expect(hint).toBeVisible();
    const before = await page.getByTestId('chip-scroll-hint').count();
    // Scroll the first chip row to its end.
    await page.getByRole('checkbox', { name: 'Göğüs', exact: true }).evaluate((chip) => {
      let p = chip.parentElement;
      while (p && !(p.scrollWidth > p.clientWidth && /(auto|scroll)/.test(getComputedStyle(p).overflowX))) p = p.parentElement;
      if (!p) return;
      p.scrollLeft = p.scrollWidth;
      p.dispatchEvent(new Event('scroll')); // what a swipe delivers
    });
    await expect.poll(() => page.getByTestId('chip-scroll-hint').count()).toBeLessThan(before);
  });
});
