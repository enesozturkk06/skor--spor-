/**
 * Motion primitives on the dev/E2E-only /motion-lab screen, with and without
 * the OS "Reduce Motion" setting (Playwright reducedMotion emulation).
 */
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

/**
 * Samples the count-up number every animation frame for `ms`.
 * With `replay`, presses "Tekrar oynat" inside the page and starts sampling
 * in the same frame, so the whole animation is observed from its start.
 */
async function sampleNumber(page: Page, ms: number, { replay = false } = {}): Promise<number[]> {
  return page.evaluate(
    ({ duration, replay: doReplay }) =>
      new Promise<number[]>((resolve) => {
        if (doReplay) (document.querySelector('[aria-label="Tekrar oynat"]') as HTMLElement).click();
        const seen: number[] = [];
        const start = performance.now();
        const tick = () => {
          const el = document.querySelector('[data-testid="lab-number"]');
          if (el?.textContent) seen.push(Number(el.textContent));
          if (performance.now() - start < duration) requestAnimationFrame(tick);
          else resolve(seen);
        };
        requestAnimationFrame(tick);
      }),
    { duration: ms, replay },
  );
}

const ringOffset = (page: Page) =>
  page.locator('[aria-label="lab-ring"] circle').nth(1).evaluate((c) => Number(c.getAttribute('stroke-dashoffset')));
const ringCircumference = (page: Page) =>
  page.locator('[aria-label="lab-ring"] circle').nth(1).evaluate((c) => 2 * Math.PI * Number(c.getAttribute('r')));
const barWidthPct = (page: Page) =>
  page.locator('[aria-label="lab-bar"] > div').evaluate((el) => (el.getBoundingClientRect().width / el.parentElement!.getBoundingClientRect().width) * 100);

async function openLab(page: Page) {
  await page.goto('/motion-lab');
  await page.locator('[data-testid="lab-number"]').waitFor({ timeout: 45_000 });
}

test.describe('Hareket altyapısı', () => {
  test('sayaç 0’dan hedefe akıcı şekilde sayar ve tam hedefte durur', async ({ page }) => {
    await openLab(page);
    await expect(page.locator('[data-testid="lab-number"]')).toHaveText('74');
    const seen = await sampleNumber(page, 1200, { replay: true });
    expect(seen.length).toBeGreaterThan(10);
    expect(Math.min(...seen), 'starts below the target').toBeLessThan(74);
    expect(new Set(seen).size, 'shows intermediate values').toBeGreaterThan(5);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    await expect(page.locator('[data-testid="lab-number"]')).toHaveText('74');
  });

  test('halka ve çubuk hedef değere animasyonla ulaşır', async ({ page }) => {
    await openLab(page);
    const c = await ringCircumference(page);
    await expect.poll(() => ringOffset(page), { timeout: 5_000 }).toBeCloseTo(c * 0.26, 0);
    await expect.poll(() => barWidthPct(page), { timeout: 5_000 }).toBeCloseTo(74, 0);
  });

  test('basılı tutulan buton küçülür, bırakınca geri döner', async ({ page }) => {
    await openLab(page);
    const btn = page.getByRole('button', { name: 'Tekrar oynat', exact: true });
    const scaleOf = () => btn.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    await btn.hover();
    await page.mouse.down();
    await expect.poll(scaleOf).toBeLessThan(0.99);
    await page.mouse.up();
    await expect.poll(scaleOf).toBeCloseTo(1, 2);
  });

  test('“tekrar oynat” animasyonları yeniden başlatır', async ({ page }) => {
    await openLab(page);
    await expect(page.locator('[data-testid="lab-number"]')).toHaveText('74');
    const c = await ringCircumference(page);
    await page.getByRole('button', { name: 'Tekrar oynat', exact: true }).click();
    // Remounted: the ring sweeps again from empty and lands on the target.
    await expect.poll(() => ringOffset(page), { timeout: 5_000 }).toBeCloseTo(c * 0.26, 0);
    await expect(page.locator('[data-testid="lab-number"]')).toHaveText('74');
  });
});

test.describe('Reduce Motion açıkken', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('sayaç, halka ve çubuk doğrudan son değeri gösterir', async ({ page }) => {
    await openLab(page);
    const seen = await sampleNumber(page, 300);
    expect(new Set(seen), 'no counting animation').toEqual(new Set([74]));
    const c = await ringCircumference(page);
    expect(await ringOffset(page)).toBeCloseTo(c * 0.26, 0);
    expect(await barWidthPct(page)).toBeCloseTo(74, 0);
  });

  test('basılınca ölçek animasyonu yapılmaz', async ({ page }) => {
    await openLab(page);
    const btn = page.getByRole('button', { name: 'Tekrar oynat', exact: true });
    await btn.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    const scale = await btn.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    await page.mouse.up();
    expect(scale).toBeCloseTo(1, 2);
  });

  test('açılış ekranı içeriği beklemeden görünür', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('button', { name: 'Hemen başla', exact: true });
    await cta.waitFor({ state: 'attached', timeout: 45_000 });
    // Without reduce motion the CTA fades in after ~700 ms; here it is opaque at once.
    const opacity = await cta.evaluate((el) => {
      let o = 1;
      for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    });
    expect(opacity).toBeGreaterThan(0.95);
  });
});
