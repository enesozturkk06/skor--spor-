/**
 * Entrance animations must leave the layout exactly as without them.
 * Regression: Reanimated web turns custom entering animations (e.g. built
 * with .withInitialValues) `position: absolute` when they finish, so blocks
 * leave the flow and later content slides up over them.
 */
import type { Page } from '@playwright/test';

import { expect, seedDemoWorkouts, test } from './fixtures';

/** Entering wrappers that ended up absolutely positioned after animating. */
const absoluteEnteringBlocks = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[style*="animation-name"]')]
      // The bug writes position:absolute into the inline style. Intentional layers
      // (e.g. the logo built from stacked SVGs, StyleSheet.absoluteFill) can carry
      // it inline too, but they exactly cover their parent — a block that left the
      // flow does not (its parent column also holds its siblings).
      .filter((el) => {
        if (el.style.position !== 'absolute') return false;
        const a = el.getBoundingClientRect();
        const p = el.parentElement?.getBoundingClientRect();
        const fillsParent =
          p && Math.abs(a.left - p.left) < 1 && Math.abs(a.top - p.top) < 1 && Math.abs(a.width - p.width) < 1 && Math.abs(a.height - p.height) < 1;
        return !fillsParent;
      })
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
    expect(await overlaps(page, ['score-ring', 'score-basis', 'week-total'])).toEqual([]);
    // The last blocks must still be below the score card.
    const score = (await page.getByTestId('score-ring').boundingBox())!;
    const quick = (await app.text('Hızlı erişim').boundingBox())!;
    expect(quick.y).toBeGreaterThan(score.y + score.height);
  });

  test('egzersiz kütüphanesi ve detayı', async ({ app, page }) => {
    await app.onboardedUser();
    await page.goto('/exercises');
    await expect(page.getByTestId('library-count')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000); // longest: 120 ms + 8 × 35 ms + 320 ms
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    expect(await overlaps(page, ['library-map', 'library-count', 'exercise-bench_press', 'exercise-incline_dumbbell_press'])).toEqual([]);

    await page.goto('/exercises/bench_press');
    await expect(page.getByTestId('exercise-title')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2500); // 8 sections × 55 ms + steps (200 ms + 4 × 70 ms) + 320 ms
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    expect(await overlaps(page, ['exercise-title', 'exercise-map', 'prescription', 'exercise-breathing'])).toEqual([]);
  });

  test('aktif antrenman ekranı', async ({ app, page }) => {
    await app.onboardedUser();
    await app.tab('Antrenman').click();
    await app.button('Başlat').click();
    await page.getByTestId('workout-add').filter({ visible: true }).click();
    await page.getByLabel('Ara', { exact: true }).fill('bench');
    await page.getByTestId('exercise-bench_press').filter({ visible: true }).click();
    await expect(page.getByTestId('workout-ex-bench_press').filter({ visible: true })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    const ids = ['workout-elapsed', 'workout-ex-bench_press', 'workout-add'];
    const rects = await Promise.all(ids.map((id) => page.getByTestId(id).filter({ visible: true }).boundingBox()));
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i]!.y, `${ids[i]} below ${ids[i - 1]}`).toBeGreaterThanOrEqual(rects[i - 1]!.y + rects[i - 1]!.height - 1);
    }
  });

  test('programlar ve program özeti', async ({ app, page }) => {
    await app.onboardedUser();
    await page.goto('/programs');
    await expect(page.getByTestId('week-plan').filter({ visible: true })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);

    await page.goto('/programs/builtin-push');
    await expect(page.getByTestId('program-title').filter({ visible: true })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    expect(await overlaps(page, ['program-title', 'program-map', 'program-block-0', 'program-block-1'])).toEqual([]);
  });

  test('geçmiş ve antrenman sonucu', async ({ app, page }) => {
    await app.onboardedUser();
    const start = new Date(Date.now() - 2 * 86_400_000);
    await seedDemoWorkouts(page, [{ start, minutes: 45, name: 'Kararlılık' }, { start: new Date(start.getTime() - 86_400_000), minutes: 40 }]);
    await page.goto('/history');
    await expect(page.getByTestId('history-summary').filter({ visible: true })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    await page.getByRole('button', { name: /^Kararlılık,/ }).click();
    await expect(page.getByTestId('result-title').filter({ visible: true })).toBeVisible();
    await page.waitForTimeout(1800);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
  });

  test('hareket laboratuvarı', async ({ page }) => {
    await page.goto('/motion-lab');
    await page.getByTestId('lab-number').waitFor({ timeout: 45_000 });
    await page.waitForTimeout(1500);
    expect(await absoluteEnteringBlocks(page)).toEqual([]);
    expect(await overlaps(page, ['lab-enter-0', 'lab-enter-1', 'lab-enter-2'])).toEqual([]);
  });
});
