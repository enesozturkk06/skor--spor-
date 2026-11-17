/**
 * Phase 3C: the active workout screen (demo build). Timers are driven with
 * Playwright's fake clock where waiting would be slow (rest end, rounds).
 * Default test profile: Boks (primary), Fitness, Koşu.
 */
import type { Page } from '@playwright/test';

import { expect, test, type App } from './fixtures';

const s = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

async function startWorkout(app: App, page: Page, sport = 'Boks') {
  await app.onboardedUser();
  await app.tab('Antrenman').click();
  await app.checkbox(sport).click();
  await app.button('Başlat').click();
  await expect(s(page, 'workout-elapsed')).toBeVisible();
}

async function addExercise(page: Page, query: string, key: string) {
  await s(page, 'workout-add').click();
  await page.getByLabel('Ara', { exact: true }).fill(query);
  await s(page, `exercise-${key}`).click();
  await expect(s(page, `workout-ex-${key}`)).toBeVisible();
}

async function logBenchSet(page: Page, n = 1, kg = '60', reps = '8') {
  await s(page, `set-bench_press-${n}-weightKg`).fill(kg);
  await s(page, `set-bench_press-${n}-reps`).fill(reps);
  await s(page, `set-bench_press-${n}-done`).click();
}

const done = (page: Page, key: string, n: number) => s(page, `set-${key}-${n}-done`);

/** The round clock's start as saved in the device draft (0 until written). */
const savedRoundStart = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('skorspor:training-active:'));
    const t = key ? JSON.parse(localStorage.getItem(key)!).roundTimer : null;
    return t ? Date.parse(t.startedAt) : 0;
  });

test.describe('Aktif antrenman', () => {
  test('set tamamlanır: onay, sayaçlar ve otomatik dinlenme; ±15 sn ve atla', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await logBenchSet(page);
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'true');
    await expect(s(page, 'workout-sets')).toHaveText('1');
    await expect(s(page, 'workout-volume')).toHaveText('480 kg');
    await expect(s(page, 'workout-ex-bench_press-count')).toHaveText('1/1');

    const time = s(page, 'rest-time');
    await expect(time).toHaveText(/^1:(30|29|28)$/);
    await app.button('Dinlenmeyi 15 saniye uzat').click();
    await expect(time).toHaveText(/^1:4[2-5]$/);
    await app.button('Dinlenmeyi 15 saniye kısalt').click();
    await app.button('Dinlenmeyi 15 saniye kısalt').click();
    await expect(time).toHaveText(/^1:1[2-5]$/);
    await expect(s(page, 'rest-ring')).toHaveAttribute('aria-valuemax', '75');
    await app.button('Dinlenmeyi atla').click();
    await expect(s(page, 'rest-panel')).toHaveCount(0);
    // The adjusted length is remembered for this exercise.
    await expect(page.getByLabel('Dinlenme 1:15', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('değersiz set tamamlanamaz; geri alınca dinlenme iptal olur', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await done(page, 'bench_press', 1).click();
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'false');
    await expect(s(page, 'rest-panel')).toHaveCount(0);

    await logBenchSet(page);
    await expect(s(page, 'rest-panel')).toBeVisible();
    await done(page, 'bench_press', 1).click();
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'false');
    await expect(s(page, 'rest-panel')).toHaveCount(0);
    await expect(s(page, 'workout-sets')).toHaveText('0');
  });

  test('dinlenme sıfıra inince panel kendiliğinden kapanır', async ({ app, page }) => {
    await page.clock.install();
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await logBenchSet(page);
    await expect(s(page, 'rest-panel')).toBeVisible();
    await page.clock.fastForward(60_000);
    await expect(s(page, 'rest-time')).toHaveText(/^0:(30|29|28)$/);
    await page.clock.fastForward(32_000);
    await expect(s(page, 'rest-panel')).toHaveCount(0);
  });

  test('uygulama yenilense de antrenman, değerler ve dinlenme kaldığı yerden sürer', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await logBenchSet(page, 1, '62,5', '6');
    await s(page, 'workout-ex-bench_press-add').click();
    await s(page, 'set-bench_press-2-weightKg').fill('65');
    await page.reload();

    await expect(s(page, 'workout-elapsed')).toBeVisible({ timeout: 30_000 });
    await expect(s(page, 'set-bench_press-1-weightKg')).toHaveValue('62,5');
    await expect(s(page, 'set-bench_press-1-reps')).toHaveValue('6');
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'true');
    await expect(s(page, 'set-bench_press-2-weightKg')).toHaveValue('65'); // typed, not completed: still saved
    await expect(s(page, 'rest-time')).toHaveText(/^1:[0-2]\d$/);
    await expect(s(page, 'workout-volume')).toHaveText('375 kg');
  });

  test('duraklatınca süre ve dinlenme durur, devam edince sürer', async ({ app, page }) => {
    await page.clock.install();
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await logBenchSet(page);
    await page.clock.fastForward(10_000);

    await s(page, 'workout-pause').click();
    await expect(s(page, 'paused-overlay')).toBeVisible();
    const elapsed = await s(page, 'workout-elapsed').textContent();
    const rest = await s(page, 'rest-time').textContent();
    await page.clock.fastForward(120_000);
    await expect(s(page, 'workout-elapsed')).toHaveText(elapsed!);
    await expect(s(page, 'rest-time')).toHaveText(rest!);

    await app.button('Devam et').click();
    await expect(s(page, 'paused-overlay')).toHaveCount(0);
    await page.clock.fastForward(5_000);
    await expect(s(page, 'workout-elapsed')).not.toHaveText(elapsed!);
    await expect(s(page, 'rest-panel')).toBeVisible(); // 120 s of pause did not end the 90 s rest
  });

  test('önceki performans gösterilir; boş sete ✓ basınca geçen seferin değerleri yazılır', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await expect(s(page, 'workout-ex-bench_press-previous')).toContainText('İlk kez');
    await logBenchSet(page, 1, '60', '8');
    await app.button('Bitir').click();
    await app.button('Antrenmanı kaydet').click();
    await app.button('Devam').click(); // completion screen (Phase 3E) → training tab
    await expect(s(page, 'last-workout')).toBeVisible();

    await app.button('Başlat').click();
    await addExercise(page, 'bench', 'bench_press');
    await expect(s(page, 'workout-ex-bench_press-previous')).toContainText('60 kg × 8');
    await expect(s(page, 'set-bench_press-1-weightKg')).toHaveAttribute('placeholder', '60');
    await done(page, 'bench_press', 1).click();
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'true');
    await expect(s(page, 'set-bench_press-1-weightKg')).toHaveValue('60');
    await expect(s(page, 'set-bench_press-1-reps')).toHaveValue('8');
  });

  test('boks raund zamanlayıcısı: hazırlık, raund, dinlenme; bildirimler ve raundlar set olarak yazılır', async ({ app, page }) => {
    await page.clock.install();
    await startWorkout(app, page, 'Boks');
    await addExercise(page, 'kum torbası', 'heavy_bag_rounds');
    await app.button('Raund zamanlayıcısı').click();
    await app.button('Raund azalt').click(); // 2 rounds
    for (let i = 0; i < 4; i++) await app.button('Raund süresi azalt').click(); // 1:00
    for (let i = 0; i < 2; i++) await app.button('Dinlenme azalt').click(); // 0:30
    await app.button('Zamanlayıcıyı başlat').click();
    // From here time only moves when the test says so (banners last a few real
    // seconds, which a loaded machine could otherwise miss). Anchored to the
    // clock's own saved start, so every step below lands at an exact moment.
    await expect.poll(() => savedRoundStart(page)).toBeGreaterThan(0);
    const startedAt = await savedRoundStart(page);
    await page.clock.pauseAt(Math.max(startedAt + 5_000, (await page.evaluate(() => Date.now())) + 10)); // in the 10 s prep

    const label = s(page, 'round-label');
    const phase = s(page, 'round-phase');
    await expect(label).toHaveText('HAZIRLAN');
    await page.clock.fastForward(startedAt + 10_500 - (await page.evaluate(() => Date.now())));
    await expect(label).toHaveText('RAUND 1 / 2');
    await expect(phase).toHaveText('RAUND');
    await expect(page.getByTestId('round-banner')).toHaveText('RAUND 1 BAŞLADI');

    await page.clock.fastForward(50_200);
    await expect(page.getByTestId('round-banner')).toHaveText('SON 10 SANİYE');
    await page.clock.fastForward(10_000);
    await expect(phase).toHaveText('DİNLENME');
    await expect(page.getByTestId('round-banner')).toHaveText('RAUND 1 BİTTİ');
    await expect(page.getByTestId('workout-ex-heavy_bag_rounds-count')).toHaveText('1/1');

    await page.clock.fastForward(30_000);
    await expect(label).toHaveText('RAUND 2 / 2');
    await page.clock.fastForward(61_000);
    await expect(page.getByTestId('round-overlay')).toHaveCount(0);
    // (Paused clock: entrance animations of new rows can't finish, so no visibility filter.)
    await expect(page.getByTestId('workout-ex-heavy_bag_rounds-count')).toHaveText('2/2');
    await expect(page.getByTestId('set-heavy_bag_rounds-2-done')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('set-heavy_bag_rounds-1-durationS')).toHaveValue('1');
  });

  test('raund saati yenilemeden sonra da açık kalır', async ({ app, page }) => {
    await startWorkout(app, page, 'Boks');
    await addExercise(page, 'kum torbası', 'heavy_bag_rounds');
    await app.button('Raund zamanlayıcısı').click();
    await app.button('Zamanlayıcıyı başlat').click();
    await expect(s(page, 'round-overlay')).toBeVisible();
    await page.reload();
    await expect(s(page, 'round-overlay')).toBeVisible({ timeout: 30_000 });
    await app.button('Raundları bitir').click();
    await expect(s(page, 'round-overlay')).toHaveCount(0);
  });

  test('güvenli bitirme: özet, eksik set uyarısı, kayıt ve antrenman sekmesine dönüş', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await app.button('Bitir').click();
    await expect(s(page, 'finish-empty')).toBeVisible();
    await expect(app.button('Antrenmanı kaydet')).toHaveAttribute('aria-disabled', 'true');
    await app.button('Devam et').click();

    await logBenchSet(page);
    await s(page, 'workout-ex-bench_press-add').click();
    await app.button('Bitir').click();
    await expect(s(page, 'finish-sets')).toHaveText('1');
    await expect(s(page, 'finish-warning')).toContainText('1 set tamamlanmadı');
    await app.radio('RPE 8').click();
    await app.button('Antrenmanı kaydet').click();
    await app.button('Devam').click(); // completion screen (Phase 3E) → training tab

    await expect(s(page, 'last-workout')).toContainText('Fitness antrenmanı');
    await expect(s(page, 'last-workout')).toContainText('1 set');
    await expect(s(page, 'last-workout')).toContainText(/KAYDEDİLDİ/);
    await expect(s(page, 'resume-card')).toHaveCount(0);
  });

  test('antrenman silme onay ister; egzersiz kaldırma onay ister', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await app.button('Düz Bench Press egzersizini kaldır').click();
    await expect(s(page, 'remove-sheet')).toBeVisible();
    await app.button('Vazgeç').click();
    await expect(s(page, 'workout-ex-bench_press')).toBeVisible();
    await app.button('Düz Bench Press egzersizini kaldır').click();
    await app.button('Kaldır').click();
    await expect(s(page, 'workout-ex-bench_press')).toHaveCount(0);

    await app.button('Bitir').click();
    await app.button('Antrenmanı sil').click();
    await expect(s(page, 'discard-sheet')).toBeVisible();
    await app.button('Evet, sil').click();
    await expect(app.button('Başlat')).toBeVisible();
    await expect(s(page, 'last-workout')).toHaveCount(0);
  });

  test('küçültünce sekmede "devam eden antrenman" kartı çıkar ve geri dönülür', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await logBenchSet(page);
    await app.button('Küçült').click();
    await expect(s(page, 'resume-card')).toContainText('1 set');
    await app.button('Antrenmana dön').click();
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('Aktif antrenman — Reduce Motion açık', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('her şey çalışır, halka sürekli dönmez (saniye adımlarıyla güncellenir)', async ({ app, page }) => {
    await startWorkout(app, page, 'Fitness');
    await addExercise(page, 'bench', 'bench_press');
    await logBenchSet(page);
    await expect(done(page, 'bench_press', 1)).toHaveAttribute('aria-checked', 'true');
    // Sample the arc every frame for exactly one second, inside the page.
    const offsets = await s(page, 'rest-ring')
      .locator('circle')
      .nth(1)
      .evaluate(
        (c) =>
          new Promise<number>((resolve) => {
            const seen = new Set<string>();
            const end = performance.now() + 1000;
            const tick = () => {
              seen.add(c.getAttribute('stroke-dashoffset') ?? '');
              if (performance.now() < end) requestAnimationFrame(tick);
              else resolve(seen.size);
            };
            tick();
          }),
      );
    // A continuous sweep changes every frame; whole-second steps give at most 2 values in 1 s.
    expect(offsets).toBeLessThanOrEqual(2);
  });
});
