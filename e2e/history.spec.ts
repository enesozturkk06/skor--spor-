/**
 * Phase 3E (demo build): completion screen, personal records, XP, history
 * with filters, confirmed delete, records screen, and per-user isolation.
 */
import type { Page } from '@playwright/test';

import { expect, makeUser, seedDemoWorkouts, test, type App, type SeedWorkout } from './fixtures';

const v = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const daysAgo = (n: number, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/** Onboarded user with the given finished workouts already on the device. */
async function athleteWith(app: App, page: Page, workouts: SeedWorkout[] = []) {
  await app.onboardedUser();
  if (workouts.length) {
    await seedDemoWorkouts(page, workouts);
    await page.reload();
    await app.expectDashboard();
  }
}

/** Logs one bench set (kg × reps) live and finishes; lands on the completion screen. */
async function finishBench(app: App, page: Page, kg: string, reps: string, warmup?: { kg: string; reps: string }) {
  await app.tab('Antrenman').click();
  await app.checkbox('Fitness').click();
  await app.button('Başlat').click();
  await v(page, 'workout-add').click();
  await page.getByLabel('Ara', { exact: true }).fill('bench');
  await v(page, 'exercise-bench_press').click();
  let n = 1;
  if (warmup) {
    await v(page, 'set-bench_press-1-kind').click(); // → ısınma
    await v(page, 'set-bench_press-1-weightKg').fill(warmup.kg);
    await v(page, 'set-bench_press-1-reps').fill(warmup.reps);
    await v(page, 'set-bench_press-1-done').click();
    await app.button('Dinlenmeyi atla').click();
    await v(page, 'workout-ex-bench_press-add').click();
    n = 2;
  }
  await v(page, `set-bench_press-${n}-weightKg`).fill(kg);
  await v(page, `set-bench_press-${n}-reps`).fill(reps);
  await v(page, `set-bench_press-${n}-kind`).isVisible();
  if (warmup) {
    // The copied set starts as "normal" again (warm-ups are not repeated).
    await expect(v(page, `set-bench_press-${n}-kind`)).toHaveAttribute('aria-label', /Normal set/);
  }
  await v(page, `set-bench_press-${n}-done`).click();
  await app.button('Bitir').click();
  await app.button('Antrenmanı kaydet').click();
  await expect(v(page, 'celebration')).toBeVisible();
}

test.describe('Tamamlama ekranı ve rekorlar', () => {
  test('yeni rekor: kutlama, rozet, önceki değer, XP ve karşılaştırma', async ({ app, page }) => {
    await athleteWith(app, page, [{ start: daysAgo(3), minutes: 50, benchKg: 60, name: 'Fitness antrenmanı' }]);
    await finishBench(app, page, '80', '6');

    await expect(v(page, 'result-title')).toHaveText('FİTNESS ANTRENMANI');
    await expect(v(page, 'pr-bench_press-weight')).toContainText('60 kg → 80 kg');
    await expect(v(page, 'pr-bench_press-e1rm')).toContainText('76 kg → 96 kg');
    await expect(v(page, 'result-xp-gained')).toHaveText(/^\+\d+ XP$/);
    await expect(v(page, 'result-compare')).toContainText('Fitness antrenmanı');
    await expect(page.getByTestId('delta-Set').filter({ visible: true })).toContainText('-2');
    await app.button('Devam').click();
    await expect(v(page, 'last-workout')).toBeVisible();
  });

  test('ilk antrenman: rekor kırılmaz, ilk ölçümler ve "ilk karşılaştırma" gösterilir', async ({ app, page }) => {
    await athleteWith(app, page);
    await finishBench(app, page, '50', '10');
    await expect(page.getByTestId('result-records').getByText('YENİ REKOR', { exact: false })).toHaveCount(0);
    await expect(v(page, 'result-firsts')).toContainText('Düz Bench Press');
    await expect(v(page, 'result-compare-none')).toBeVisible();
  });

  test('ısınma seti rekor sayılmaz', async ({ app, page }) => {
    await athleteWith(app, page, [{ start: daysAgo(2), minutes: 50, benchKg: 60 }]);
    await finishBench(app, page, '55', '8', { kg: '100', reps: '1' });
    await expect(page.getByTestId('pr-bench_press-weight')).toHaveCount(0);
    await expect(page.getByTestId('pr-bench_press-e1rm')).toHaveCount(0);
    await expect(v(page, 'result-ex-bench_press')).toContainText('Ö');
  });

  test('rekorlar ekranı: değer, tarih ve antrenman; dokununca o antrenman açılır', async ({ app, page }) => {
    await athleteWith(app, page, [
      { start: daysAgo(9), minutes: 40, benchKg: 60, name: 'Eski', plankS: 60 },
      { start: daysAgo(2), minutes: 45, benchKg: 70, name: 'Yeni', plankS: 45 },
    ]);
    await page.goto('/records');
    await expect(v(page, 'records-summary')).toHaveText('2 egzersizde 4 kişisel rekor');
    await expect(v(page, 'record-bench_press-weight')).toContainText('70 kg');
    await expect(v(page, 'record-bench_press-weight')).toContainText('Yeni');
    // The longer plank was in the older workout: the record stays there.
    await expect(v(page, 'record-plank-duration')).toContainText('1:00 dk');
    await expect(v(page, 'record-plank-duration')).toContainText('Eski');
    await v(page, 'record-plank-duration').click();
    await expect(v(page, 'result-title')).toHaveText('ESKİ');
  });
});

test.describe('Antrenman geçmişi', () => {
  test('filtreler: dönem, branş ve egzersiz; haftalara göre gruplu', async ({ app, page }) => {
    await athleteWith(app, page, [
      { start: daysAgo(1), minutes: 50, name: 'Bench + plank', plankS: 40 },
      { start: daysAgo(10), minutes: 30, name: 'Boks gücü', sport: 'boxing' },
      { start: daysAgo(45), minutes: 40, name: 'Eski seans' },
    ]);
    await app.tab('Antrenman').click();
    await app.button('Geçmiş').click();
    const summary = v(page, 'history-summary');
    await expect(summary).toHaveText('3 antrenman · 120 dk · 10 set');
    await app.checkbox('30 gün').click();
    await expect(summary).toContainText('2 antrenman');
    await app.checkbox('Tümü').click();
    await app.checkbox('Boks').click();
    await expect(summary).toHaveText('1 antrenman · 30 dk · 3 set');
    await app.checkbox('Boks').click();
    await app.checkbox('Plank').click();
    await expect(summary).toHaveText('1 antrenman · 50 dk · 4 set');
    await expect(page.getByText('Bench + plank').filter({ visible: true })).toBeVisible();
  });

  test('ayrıntı ve onaylı silme: kayıt, rekorlar ve skor güncellenir; yenilemede geri gelmez', async ({ app, page }) => {
    await athleteWith(app, page, [{ start: daysAgo(4), minutes: 40, benchKg: 60, name: 'Silinecek' }]);
    await page.goto('/history');
    await page.getByRole('button', { name: /^Silinecek,/ }).click();
    await expect(v(page, 'result-title')).toHaveText('SİLİNECEK');
    await app.button('Antrenmanı sil').click();
    await expect(v(page, 'delete-workout-sheet')).toBeVisible();
    await app.button('Vazgeç').click();
    await expect(v(page, 'result-title')).toBeVisible();
    await app.button('Antrenmanı sil').click();
    await app.button('Evet, sil').click();
    await expect(v(page, 'history-empty')).toBeVisible();
    await page.reload();
    await expect(v(page, 'history-empty')).toBeVisible({ timeout: 30_000 });
    await page.goto('/records');
    await expect(v(page, 'records-empty')).toBeVisible();
  });

  test('bitirilen antrenman ana ekranı besler; skor 3 antrenmanda kalibre olur', async ({ app, page }) => {
    await athleteWith(app, page, [{ start: daysAgo(3), minutes: 50 }]);
    await expect(v(page, 'calibration-count')).toHaveText('1/3');
    await finishBench(app, page, '60', '8');
    await app.button('Devam').click();
    await app.tab('Ana Sayfa').click();
    await expect(v(page, 'calibration-count')).toHaveText('2/3');
    await seedDemoWorkouts(page, [{ start: daysAgo(5), minutes: 45 }]);
    await page.reload();
    await expect(v(page, 'athlete-score')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('score-calibrating')).toHaveCount(0);
  });

  test('başka kullanıcı geçmişi, rekorları ve skoru görmez', async ({ app, page }) => {
    await athleteWith(app, page, [
      { start: daysAgo(1), minutes: 50, name: 'A seansı' },
      { start: daysAgo(2), minutes: 50 },
      { start: daysAgo(3), minutes: 50 },
    ]);
    await expect(v(page, 'athlete-score')).toBeVisible();
    await app.signOut();
    await app.onboardedUser(makeUser());
    await expect(v(page, 'calibration-count')).toHaveText('0/3');
    await page.goto('/history');
    await expect(v(page, 'history-empty')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('A seansı')).toHaveCount(0);
    await page.goto('/records');
    await expect(v(page, 'records-empty')).toBeVisible();
  });
});

test.describe('Uzun geçmiş (demo)', () => {
  test('130 antrenman: en eski antrenmandaki rekor bulunur, geçmiş 30’ar gösterilir, skor tüm pencereyle hesaplanır', async ({ app, page }) => {
    // Oldest first: #1 (130 days ago) holds the heaviest bench.
    const workouts = Array.from({ length: 130 }, (_, i) => ({
      start: daysAgo(130 - i),
      minutes: 40,
      name: i === 0 ? 'En eski seans' : `Seans ${i + 1}`,
      benchKg: i === 0 ? 150 : 60,
    }));
    await athleteWith(app, page, workouts);
    await expect(v(page, 'athlete-score')).toBeVisible({ timeout: 30_000 });

    await page.goto('/records');
    await expect(v(page, 'record-bench_press-weight')).toContainText('150 kg', { timeout: 30_000 });
    await expect(v(page, 'record-bench_press-weight')).toContainText('En eski seans');

    await page.goto('/history');
    await expect(v(page, 'history-summary')).toHaveText('130 antrenman · 5200 dk · 390 set', { timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^Seans \d+,/ }).filter({ visible: true })).toHaveCount(30);
    await app.button('Daha fazla göster (100)').click();
    await expect(page.getByRole('button', { name: /^Seans \d+,/ }).filter({ visible: true })).toHaveCount(60);
  });
});
