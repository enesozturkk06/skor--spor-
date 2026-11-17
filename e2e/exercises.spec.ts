/**
 * Phase 3A: exercise library + exercise detail with the interactive muscle map
 * (demo build). The default test profile's goals are "Güç artışı" first.
 */
import type { Page } from '@playwright/test';

import { expect, test, type App } from './fixtures';

const TOTAL = /^62 egzersiz$/;

const mapState = (page: Page, map: string, side: 'front' | 'back', muscle: string) =>
  page.getByTestId(map).getByTestId(`muscle-${side}-${muscle}`).getAttribute('data-state');

/** Onboarded user on the library screen (via the training tab, like a real user). */
async function openLibrary(app: App, page: Page) {
  await app.onboardedUser();
  await app.tab('Antrenman').click();
  await page.getByRole('button', { name: 'Egzersiz kütüphanesini aç' }).click();
  await expect(page.getByTestId('library-count')).toHaveText(TOTAL);
}

async function openExercise(app: App, page: Page, key: string) {
  await app.onboardedUser();
  await page.goto(`/exercises/${key}`);
  await expect(page.getByTestId('exercise-title')).toBeVisible({ timeout: 30_000 });
}

test.describe('Egzersiz kütüphanesi', () => {
  test('ana ekrandaki hızlı erişimden açılır, artık "Yakında" değil; geri dönülür', async ({ app, page }) => {
    await app.onboardedUser();
    const tile = page.getByRole('button', { name: /^Egzersiz Kütüphanesi,/ });
    await expect(tile).not.toContainText('YAKINDA');
    await tile.click();
    await expect(page.getByTestId('library-count')).toHaveText(TOTAL);
    await expect(app.text('Egzersiz kütüphanesi')).toBeVisible();
    await app.button('Geri').click();
    await app.expectDashboard();
  });

  test('arama Türkçe karakterden bağımsız çalışır ve temizlenir', async ({ app, page }) => {
    await openLibrary(app, page);
    await app.field('Ara').fill('sinav');
    await expect(page.getByTestId('exercise-push_up')).toBeVisible();
    await expect(page.getByTestId('exercise-bench_press')).toHaveCount(0);
    await expect(page.getByTestId('library-count')).toHaveText(/^\d+ \/ 62 egzersiz$/);

    await app.field('Ara').fill('xyzxyz');
    await expect(app.text('Sonuç bulunamadı')).toBeVisible();
    await app.button('Filtreleri temizle').click();
    await expect(page.getByTestId('library-count')).toHaveText(TOTAL);
    await expect(app.field('Ara')).toHaveValue('');
  });

  test('kas haritasında göğse dokununca liste filtrelenir; tekrar dokununca kalkar', async ({ app, page }) => {
    await openLibrary(app, page);
    const chest = page.getByTestId('library-map').getByTestId('muscle-front-chest');
    expect(await mapState(page, 'library-map', 'front', 'chest')).toBe('idle');

    await chest.click();
    await expect.poll(() => mapState(page, 'library-map', 'front', 'chest')).toBe('selected');
    await expect(page.getByTestId('library-muscle')).toHaveText('Göğüs · Chest');
    await expect(page.getByTestId('library-count')).toHaveText(/^\d+ \/ 62 egzersiz$/);
    await expect(page.getByTestId('exercise-bench_press')).toBeVisible();
    await expect(page.getByTestId('exercise-deadlift')).toHaveCount(0);
    // Primary chest exercises come before ones that only use it secondarily.
    const first = page.locator('[data-testid^="exercise-"]').first();
    await expect(first).toHaveAttribute('data-testid', 'exercise-bench_press');

    await chest.click();
    await expect(page.getByTestId('library-count')).toHaveText(TOTAL);
    expect(await mapState(page, 'library-map', 'front', 'chest')).toBe('idle');
  });

  test('kas grubu çipi haritada ilgili kasları yakar; branş filtresiyle birleşir', async ({ app, page }) => {
    await openLibrary(app, page);
    await app.checkbox('Sırt').click();
    await expect(app.checkbox('Sırt')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => mapState(page, 'library-map', 'back', 'lats')).toBe('primary');
    await expect.poll(() => mapState(page, 'library-map', 'back', 'traps')).toBe('primary');
    expect(await mapState(page, 'library-map', 'front', 'chest')).toBe('idle');

    await app.checkbox('Yüzme').click();
    await expect(page.getByTestId('exercise-freestyle_swim')).toBeVisible();
    await expect(page.getByTestId('exercise-deadlift')).toHaveCount(0);
  });

  test('branş filtresi: karate teknikleri listelenir; kullanıcının branşı önce gelir', async ({ app, page }) => {
    await openLibrary(app, page);
    // Default test profile: Boks (primary), Fitness, Koşu.
    // Chips: 6 muscle groups, then sports.
    const labels = await page.getByRole('checkbox').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    expect(labels.slice(6, 9)).toEqual(['Boks', 'Fitness', 'Koşu']);
    expect(labels.length).toBe(6 + 11);
    await app.checkbox('Karate').click();
    for (const key of ['mae_geri', 'mawashi_geri', 'gyaku_zuki', 'kiba_dachi_hold', 'kata_practice']) {
      await expect(page.getByTestId(`exercise-${key}`)).toBeVisible();
    }
    await expect(page.getByTestId('exercise-bench_press')).toHaveCount(0);
  });
});

test.describe('Egzersiz detayı', () => {
  test('TR/EN ad, kas haritası, teknik, nefes, hatalar ve branşlar görünür', async ({ app, page }) => {
    await openLibrary(app, page);
    await page.getByTestId('exercise-bench_press').click();
    await expect(page.getByTestId('exercise-title')).toHaveText('DÜZ BENCH PRESS');
    await expect(page.getByTestId('exercise-name-en')).toHaveText('Barbell Bench Press');

    expect(await mapState(page, 'exercise-map', 'front', 'chest')).toBe('primary');
    expect(await mapState(page, 'exercise-map', 'front', 'front_delts')).toBe('secondary');
    expect(await mapState(page, 'exercise-map', 'back', 'triceps')).toBe('secondary');
    expect(await mapState(page, 'exercise-map', 'back', 'hamstrings')).toBe('idle');
    await expect(page.getByTestId('exercise-map')).toHaveAttribute('aria-label', /Birincil: Göğüs\. İkincil: Ön omuz, Triceps\./);

    await expect(app.text('Teknik')).toBeVisible();
    await expect(page.getByText(/^Sehpaya uzan;/)).toBeVisible();
    await expect(page.getByTestId('exercise-breathing')).toContainText('nefes');
    await expect(app.text('Sık yapılan hatalar')).toBeVisible();
    await expect(page.getByText(/^Barı göğüsten sektirmek/)).toBeVisible();
    await expect(app.text('Branşlar')).toBeVisible();
  });

  test('kasa dokununca bilgisi gösterilir (harita ve çip)', async ({ app, page }) => {
    await openExercise(app, page, 'bench_press');
    const info = page.getByTestId('muscle-info');
    await expect(info).toContainText('Göğüs');
    await expect(info).toContainText('Birincil kas');

    await page.getByRole('button', { name: 'Triceps, ikincil kas' }).click();
    await expect(info).toContainText('Triceps');
    await expect(info).toContainText('İkincil kas · arka görünüm');
    expect(await mapState(page, 'exercise-map', 'back', 'triceps')).toBe('secondary');

    // Tapping a muscle the exercise does not use is explained, not ignored.
    await page.getByTestId('exercise-map').getByTestId('muscle-back-hamstrings').click();
    await expect(info).toContainText('Bu harekette aktif değil');
  });

  test('set önerisi hedefe göre seçili gelir ve değiştirilebilir', async ({ app, page }) => {
    await openExercise(app, page, 'bench_press');
    // Profile goal #1 is "Güç artışı" → Güç.
    await expect(app.radio('Güç')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('prescription')).toContainText('3–6 tekrar');
    await expect(app.text('Hedeflerine göre önerildi')).toBeVisible();

    await app.radio('Dayanıklılık').click();
    await expect(app.radio('Dayanıklılık')).toHaveAttribute('aria-checked', 'true');
    await expect(app.radio('Güç')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('prescription')).toContainText('15–20 tekrar');
    await expect(page.getByText('Hedeflerine göre önerildi')).toHaveCount(0);
  });

  test('benzer egzersize geçilir; bilinmeyen egzersiz ve eski modül linki kütüphaneye yönlenir', async ({ app, page }) => {
    await openExercise(app, page, 'bench_press');
    await page.getByTestId('exercise-push_up').click();
    // The previous detail stays mounted (hidden) in the stack on web.
    await expect(page.getByTestId('exercise-title').filter({ visible: true })).toHaveText('ŞINAV');
    await expect(page).toHaveURL(/\/exercises\/push_up$/);

    await page.goto('/exercises/does_not_exist');
    await expect(page.getByTestId('library-count')).toHaveText(TOTAL, { timeout: 30_000 });
    await page.goto('/module/exercises');
    await expect(page.getByTestId('library-count')).toHaveText(TOTAL, { timeout: 30_000 });
  });

  test('birincil kaslar canlı nabız animasyonu taşır', async ({ app, page }) => {
    await openExercise(app, page, 'bench_press');
    const heat = page.getByTestId('exercise-map').getByTestId('muscle-heat-front');
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      seen.add(await heat.evaluate((el) => getComputedStyle(el).opacity));
      await page.waitForTimeout(150);
    }
    expect(seen.size, 'heat layer opacity changes').toBeGreaterThan(3);
  });
});

test.describe('Egzersiz detayı — Reduce Motion açık', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('nabız animasyonu çalışmaz, kaslar yine renkli', async ({ app, page }) => {
    await openExercise(app, page, 'bench_press');
    const heat = page.getByTestId('exercise-map').getByTestId('muscle-heat-front');
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      seen.add(await heat.evaluate((el) => getComputedStyle(el).opacity));
      await page.waitForTimeout(150);
    }
    expect([...seen]).toEqual(['0']);
    expect(await mapState(page, 'exercise-map', 'front', 'chest')).toBe('primary');
  });
});
