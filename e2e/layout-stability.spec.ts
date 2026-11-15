/**
 * Entrance animations must leave the layout exactly as without them.
 * Regression: Reanimated web turns custom entering animations (e.g. built
 * with .withInitialValues) `position: absolute` when they finish, so blocks
 * leave the flow and later content slides up over them.
 */
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

/** Entering wrappers that ended up absolutely positioned after animating. */
const absoluteEnteringBlocks = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[style*="animation-name"]')]
      .filter((el) => getComputedStyle(el).position === 'absolute')
      .map((el) => (el.textContent ?? '').trim().slice(0, 30)),
  );

/** Vertical overlap between consecutive visible blocks of a column. */
async function overlaps(page: Page, testIds: string[]) {
  const rects = await Promise.all(testIds.map((id) => page.getByTestId(id).boundingBox()));
  const bad: string[] = [];
  for (let i = 1; i < rects.length; i++) {
    const a = rects[i - 1]!;
    const b = rects[i]!;
    if (b.y < a.y + a.height - 1) bad.push(`${testIds[i]} overlaps ${testIds[i - 1]}`);
  }
  return bad;
}

test.describe('Giriş animasyonlarından sonra yerleşim bozulmaz', () => {
  test('açılış ekranı', async ({ app, page }) => {
    await app.openWelcome();
    await page.waitForTimeout(2000); // all entrances done (longest: 700 ms + 450 ms)
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
  });

  test('ana ekran', async ({ app, page }) => {
    await app.onboardedUser();
    await page.waitForTimeout(2500);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    expect(await overlaps(page, ['athlete-score', 'week-total'])).toEqual([]);
    // The last blocks must still be below the score card.
    const score = (await page.getByTestId('athlete-score').boundingBox())!;
    const quick = (await app.text('Hızlı erişim').boundingBox())!;
    expect(quick.y).toBeGreaterThan(score.y + score.height);
  });

  test('hareket laboratuvarı', async ({ page }) => {
    await page.goto('/motion-lab');
    await page.getByTestId('lab-number').waitFor({ timeout: 45_000 });
    await page.waitForTimeout(1500);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    expect(await overlaps(page, ['lab-enter-0', 'lab-enter-1', 'lab-enter-2'])).toEqual([]);
  });
});
