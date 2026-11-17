/**
 * Animated, interactive dashboard (demo build), fed by REAL logged workouts
 * (Phase 3E). Date is pinned to Thu 12 Nov 2026 and three workouts are
 * seeded: Mon 52 min, Wed 64 min, Thu (today, morning) 32 min; Fri–Sun are
 * in the future. Three workouts = the score is calibrated.
 */
import type { Page } from '@playwright/test';

import { expect, makeUser, seedDemoWorkouts, test, type App } from './fixtures';

const THURSDAY = new Date('2026-11-12T10:00:00+03:00');
const WEEK = [
  { start: new Date('2026-11-09T18:00:00+03:00'), minutes: 52 },
  { start: new Date('2026-11-11T18:00:00+03:00'), minutes: 64 },
  { start: new Date('2026-11-12T08:00:00+03:00'), minutes: 32 },
];

/**
 * Starts recording the Athlete Score text from the moment it appears, every
 * frame, for `ms`. Call before the dashboard mounts; await the result after.
 */
function recordScore(page: Page, ms = 1600): Promise<number[]> {
  return page.evaluate(
    (duration) =>
      new Promise<number[]>((resolve) => {
        const seen: number[] = [];
        let start = -1;
        const giveUp = performance.now() + 20000;
        const tick = () => {
          const el = document.querySelector('[data-testid="athlete-score"]');
          if (el?.textContent) {
            if (start < 0) start = performance.now();
            seen.push(Number(el.textContent));
          }
          const now = performance.now();
          if ((start >= 0 && now - start > duration) || now > giveUp) resolve(seen);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

const finalScore = async (page: Page) => {
  const label = await page.locator('[aria-label^="Athlete Score "][aria-label$="/ 100"]').getAttribute('aria-label');
  return Number(/Athlete Score (\d+)/.exec(label ?? '')?.[1]);
};
const ringOffset = (page: Page) =>
  page.locator('[data-testid="score-ring"] circle').nth(1).evaluate((c) => Number(c.getAttribute('stroke-dashoffset')));
const ringCircumference = (page: Page) =>
  page.locator('[data-testid="score-ring"] circle').nth(1).evaluate((c) => 2 * Math.PI * Number(c.getAttribute('r')));
const barHeight = (page: Page, i: number) =>
  page.locator(`[data-testid="week-bar-${i}"] > div`).last().evaluate((el) => el.getBoundingClientRect().height);
const flameTransforms = (page: Page, ms: number) =>
  page.locator('[data-testid="streak-flame"] > div').nth(1).evaluate(
    (el, duration) =>
      new Promise<string[]>((resolve) => {
        const seen: string[] = [];
        const end = performance.now() + duration;
        const tick = () => {
          seen.push(getComputedStyle(el).transform);
          if (performance.now() < end) requestAnimationFrame(tick);
          else resolve(seen);
        };
        tick();
      }),
    ms,
  );

/**
 * Signs up, logs this week's workouts on the device, onboards, and records
 * the score from its first frame on the dashboard.
 */
async function onboardAndRecord(app: App, page: Page, seed = true) {
  await page.clock.setFixedTime(THURSDAY);
  await app.signUp(makeUser());
  if (seed) {
    await seedDemoWorkouts(page, WEEK);
    await page.reload(); // the app reads the history on start; onboarding resumes
    const intro = app.button('Başlayalım');
    await expect(intro.or(app.text('Ana branşın'))).toBeVisible({ timeout: 30_000 });
    if (await intro.isVisible()) await app.startOnboarding();
  }
  const recording = recordScore(page); // starts watching before the dashboard mounts
  await app.completeOnboarding();
  await app.expectDashboard();
  return recording;
}

test.describe('Ana ekran animasyonları', () => {
  test('Athlete Score sıfırdan akıcı yükselir, halka aynı değerde durur', async ({ app, page }) => {
    const seen = await onboardAndRecord(app, page);
    const target = await finalScore(page);
    expect(target).toBeGreaterThan(0);
    expect(seen[0], 'starts from zero').toBeLessThan(target / 3);
    // Alone, headless Chromium shows ~20 distinct values (~30 fps software
    // rendering); with 6 parallel workers it can drop to ~5. ≥4 still proves
    // a real count-up (start near 0, rising, landing on target).
    expect(new Set(seen).size, 'visible intermediate values').toBeGreaterThanOrEqual(4);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    await expect(page.locator('[data-testid="athlete-score"]')).toHaveText(String(target));
    const c = await ringCircumference(page);
    await expect.poll(() => ringOffset(page)).toBeCloseTo(c * (1 - target / 100), 0);
    // Screen readers get the value too (aria-valuenow, not the ignored accessibilityValue).
    await expect(page.getByTestId('score-ring')).toHaveAttribute('aria-valuenow', String(target));
  });

  test('haftalık grafik: çubuklar orantılı büyür, gün seçilir, gelecek günler pasif', async ({ app, page }) => {
    await onboardAndRecord(app, page);
    await expect(page.locator('[data-testid="week-total"]')).toHaveText('148');
    // Wed 64 vs Mon 52 once grown.
    await expect.poll(async () => (await barHeight(page, 2)) / (await barHeight(page, 0))).toBeCloseTo(64 / 52, 1);

    const today = page.locator('[data-testid="week-bar-3"]');
    await expect(today).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid="week-selected-value"]')).toHaveText('32 dk');

    await page.locator('[data-testid="week-bar-2"]').click();
    await expect(page.locator('[data-testid="week-bar-2"]')).toHaveAttribute('aria-selected', 'true');
    await expect(today).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('[data-testid="week-selected-value"]')).toHaveText('64 dk');

    await expect(page.locator('[data-testid="week-bar-5"]')).toHaveAttribute('aria-label', 'Cmt, henüz gelmedi');
    await expect(page.locator('[data-testid="week-bar-5"]')).toHaveAttribute('aria-disabled', 'true');
  });

  test('seri alevi canlı; başka sekmeye geçince durur', async ({ app, page }) => {
    await onboardAndRecord(app, page);
    await expect(page.locator('[data-testid="streak-days"]')).toHaveText('2');
    const live = await flameTransforms(page, 900);
    expect(new Set(live).size, 'flame is moving').toBeGreaterThan(5);

    await app.tab('Profil').click();
    await page.waitForTimeout(400);
    const paused = await flameTransforms(page, 600);
    expect(new Set(paused).size, 'no animation while the tab is hidden').toBe(1);
  });

  test('hiçbir örnek veri yok: antrenman gerçek, beslenme ve recovery yakında (değersiz)', async ({ app, page }) => {
    await onboardAndRecord(app, page);
    await expect(page.getByText(/ÖRNEK|Örnek veri/)).toHaveCount(0);
    await expect(page.getByTestId('stat-sessions')).toHaveText('3');
    await expect(page.getByTestId('stat-minutes')).toHaveText('2 sa 28'); // 148 dk
    await expect(page.getByTestId('nutrition-card')).toContainText('YAKINDA');
    await expect(page.getByTestId('recovery-card')).toContainText('YAKINDA');
    // No intake, readiness, sleep or heart-rate numbers anywhere.
    await expect(page.getByText(/\d+ ?bpm|kcal kaldı|^\d+%$|^\d+([.,]\d)? sa$/)).toHaveCount(0);
    await app.button('Skor neye dayanıyor?').click();
    await expect(page.getByTestId('score-part-frequency')).toContainText('3 / 4 gün');
    await expect(page.getByTestId('score-part-volume')).toContainText('148 / 240 dk'); // Boks: 4 × 60 dk
    await expect(page.getByTestId('score-scope')).toContainText('yalnızca kaydettiğin antrenmanlara');
  });

  test('yeni sporcu: skor kalibre edilir, sayı gösterilmez; hafta boş', async ({ app, page }) => {
    await onboardAndRecord(app, page, false);
    await expect(page.getByTestId('score-calibrating')).toBeVisible();
    await expect(page.getByTestId('calibration-count')).toHaveText('0/3');
    await expect(page.getByTestId('athlete-score')).toHaveCount(0);
    await expect(page.getByTestId('week-total')).toHaveText('0');
    await expect(page.getByTestId('streak-days')).toHaveText('0');
    await expect(page.getByTestId('stat-rpe')).toHaveText('—');
  });

  test('web: Yenile butonu profili arka planda yeniler, ekranı silmez', async ({ app, page }) => {
    await onboardAndRecord(app, page);
    const btn = app.button('Yenile');
    await btn.click();
    await expect(app.button('Yenile')).toBeEnabled();
    await app.expectDashboard();
    await expect(page.getByText('Boks sporcusu')).toBeVisible();
  });
});

test.describe('Ana ekran — Reduce Motion açık', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('skor, halka ve çubuklar anında son değerde; alev sabit', async ({ app, page }) => {
    const seen = await onboardAndRecord(app, page);
    const target = await finalScore(page);
    expect(new Set(seen), 'no counting').toEqual(new Set([target]));
    const c = await ringCircumference(page);
    expect(await ringOffset(page)).toBeCloseTo(c * (1 - target / 100), 0);
    expect((await barHeight(page, 2)) / (await barHeight(page, 0))).toBeCloseTo(64 / 52, 1);
    const flame = await flameTransforms(page, 600);
    expect(new Set(flame).size, 'flame does not move').toBe(1);
  });
});
