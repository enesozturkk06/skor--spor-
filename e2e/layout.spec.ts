import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

/** Content must never cause horizontal page scrolling. */
async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe('Responsive yerleşim', () => {
  test('açılış ve dashboard yatay taşma yapmaz', async ({ app, page }) => {
    await app.openWelcome();
    await expectNoHorizontalOverflow(page);
    await app.onboardedUser();
    await expectNoHorizontalOverflow(page);
  });

  test('üst üste açılan ekranlarda SVG kimlikleri benzersiz (logo ve arka plan boyanır)', async ({ app, page }) => {
    // Sign-in is pushed over the still-mounted welcome screen: two logos, two backdrops.
    await app.openSignIn();
    const duplicates = await page.evaluate(() => {
      const seen = new Map<string, number>();
      document.querySelectorAll('svg [id]').forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
      return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    });
    expect(duplicates, 'duplicate SVG ids break url(#id) gradients').toEqual([]);
    expect(await page.locator('svg linearGradient, svg radialGradient').count()).toBeGreaterThan(3);
  });

  test('alt menü her ekran genişliğinde görünür ve 5 sekme içerir', async ({ app, page }) => {
    await app.onboardedUser();
    await expect(page.getByRole('tab')).toHaveCount(5);
    const bar = await page.getByRole('tablist').boundingBox();
    const viewport = page.viewportSize()!;
    expect(bar).not.toBeNull();
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(viewport.height);
    expect(bar!.width).toBeLessThanOrEqual(560);
  });
});
