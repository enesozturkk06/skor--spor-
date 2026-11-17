/**
 * Phase 3D: Workout Builder, programs, built-in templates and the weekly plan
 * (demo build). Default test profile: Boks (primary), Fitness, Koşu.
 */
import type { Page } from '@playwright/test';

import { expect, makeUser, test, type App } from './fixtures';

const v = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const upper = (s: string) => s.toLocaleUpperCase('tr-TR');
const todayLong = (page: Page) =>
  page.evaluate(() => ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][(new Date().getDay() + 6) % 7]);

async function openPrograms(app: App, page: Page) {
  await app.onboardedUser();
  await app.tab('Antrenman').click();
  await app.button('Programlar ve haftalık plan').click();
  await expect(v(page, 'week-plan')).toBeVisible();
}

async function addToProgram(page: Page, query: string, key: string) {
  await v(page, 'program-add-exercise').click();
  const picker = page.getByTestId('program-picker');
  await picker.getByLabel('Ara', { exact: true }).fill(query);
  await picker.getByTestId(`exercise-${key}`).click();
  await expect(v(page, `block-${key}`)).toBeVisible();
}

/** Builds and saves "Güç Günü" (Fitness, Güç) with bench + pull-up + squat on the given days. */
async function buildProgram(app: App, page: Page, days: string[] = ['Pazartesi', 'Perşembe']) {
  await app.button('Yeni program').click();
  await app.field('Program adı').fill('Güç Günü');
  await app.checkbox('Fitness').click();
  await app.checkbox('Güç').click();
  for (const d of days) await app.checkbox(d).click();
  await addToProgram(page, 'bench', 'bench_press');
  await addToProgram(page, 'barfiks', 'pull_up');
  await addToProgram(page, 'squat', 'back_squat');
}

test.describe('Workout Builder', () => {
  test('sıfırdan program: branş, hedef, günler, set türü, ağırlık ve dinlenme; kayıt ve etkileyici özet', async ({ app, page }) => {
    await openPrograms(app, page);
    await expect(v(page, 'my-programs-empty')).toBeVisible();
    await buildProgram(app, page);

    await v(page, 'block-bench_press-set-1-kind').click(); // normal → ısınma
    await expect(v(page, 'block-bench_press-set-1-kind')).toHaveAttribute('aria-label', 'Set 1: Isınma seti. Türü değiştir');
    await v(page, 'block-bench_press-set-1-weightKg').fill('40');
    await v(page, 'block-bench_press-set-2-weightKg').fill('60');
    await app.button('Düz Bench Press dinlenmeyi artır').click();
    await expect(v(page, 'block-bench_press-rest')).toHaveText('1:45');
    await app.button('Barfiks set 3 sil').click();
    await app.button('Programı kaydet').click();

    await expect(v(page, 'program-title')).toHaveText(upper('Güç Günü'));
    await expect(v(page, 'program-days')).toHaveText('Pazartesi · Perşembe');
    await expect(v(page, 'program-block-0')).toContainText('Düz Bench Press');
    await expect(v(page, 'program-block-0')).toContainText('Ö 1 × 40 kg × 10 · 1 × 60 kg × 10 · 1 × 10');
    await expect(v(page, 'program-block-0')).toContainText('Dinlenme 105 sn');
    await expect(v(page, 'program-block-1')).toContainText('2 × 10');
    await expect(v(page, 'program-sets')).toHaveText('8'); // 3 + 2 + 3, counted up

    await app.button('Geri').click();
    await expect(v(page, 'my-programs')).toContainText('Güç Günü');
    await page.getByRole('tab', { name: /^Pazartesi/ }).click();
    await expect(v(page, 'week-plan')).toContainText('Güç Günü');
    await page.getByRole('tab', { name: /^Salı/ }).click();
    await expect(v(page, 'week-rest')).toBeVisible();
  });

  test('kaydetmeden önce doğrulama; kaydedilmemiş değişiklikte çıkış onayı', async ({ app, page }) => {
    await openPrograms(app, page);
    await app.button('Yeni program').click();
    await app.button('Programı kaydet').click();
    await expect(v(page, 'editor-error')).toHaveText('Programa bir ad ver.');
    await app.field('Program adı').fill('Boş');
    await app.button('Programı kaydet').click();
    await expect(v(page, 'editor-error')).toHaveText('En az bir egzersiz ekle.');

    await app.button('Geri').click();
    await expect(v(page, 'leave-sheet')).toBeVisible();
    await app.button('Kaydetmeden çık').click();
    await expect(v(page, 'my-programs-empty')).toBeVisible();
  });

  test('sürükle-bırak ile sıralama (ve erişilebilir ↑/↓); sıra kaydedilir', async ({ app, page }) => {
    await openPrograms(app, page);
    await buildProgram(app, page);
    await app.checkbox('Sırala').click();
    await expect(v(page, 'reorder-list')).toBeVisible();

    // Drag Squat (3rd) by its handle to the top.
    const handle = (await v(page, 'drag-handle-2').boundingBox())!;
    const x = handle.x + handle.width / 2;
    await page.mouse.move(x, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, handle.y - 60, { steps: 10 });
    await page.mouse.move(x, handle.y - 170, { steps: 10 });
    await page.mouse.up();
    const order = () =>
      page.locator('[data-testid^="reorder-"]:not([data-testid="reorder-list"])').evaluateAll((els) =>
        els.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y).map((e) => e.getAttribute('data-testid')),
      );
    await expect.poll(order).toEqual(['reorder-back_squat', 'reorder-bench_press', 'reorder-pull_up']);

    // Keyboard / screen-reader path.
    await app.button('Barfiks yukarı taşı').click();
    await expect.poll(order).toEqual(['reorder-back_squat', 'reorder-pull_up', 'reorder-bench_press']);

    await app.checkbox('Bitti').click();
    await app.button('Programı kaydet').click();
    await expect(v(page, 'program-block-0')).toContainText('Squat');
    await expect(v(page, 'program-block-1')).toContainText('Barfiks');
    await expect(v(page, 'program-block-2')).toContainText('Düz Bench Press');
  });

  test('düzenle, çoğalt ve onaylı silme', async ({ app, page }) => {
    await openPrograms(app, page);
    await buildProgram(app, page);
    await app.button('Programı kaydet').click();
    await expect(v(page, 'program-title')).toBeVisible();

    await app.button('Düzenle').click();
    await app.field('Program adı').fill('Güç Günü A');
    await app.button('Barfiks programdan çıkar').click();
    await app.button('Programı kaydet').click();
    await expect(v(page, 'program-title')).toHaveText(upper('Güç Günü A'));
    await expect(page.getByTestId('program-block-2').filter({ visible: true })).toHaveCount(0);

    await app.button('Çoğalt').click();
    await expect(v(page, 'program-title')).toHaveText(upper('Güç Günü A (kopya)'));
    await app.button('Programı sil').click();
    await expect(v(page, 'delete-program-sheet')).toBeVisible();
    await app.button('Evet, sil').click();
    await expect(v(page, 'my-programs')).toContainText('Güç Günü A');
    await expect(v(page, 'my-programs')).not.toContainText('(kopya)');
  });

  test('programlar yenilemeden sonra kalır ve başka kullanıcıya görünmez', async ({ app, page }) => {
    await openPrograms(app, page);
    await buildProgram(app, page);
    await app.button('Programı kaydet').click();
    await page.reload();
    await expect(v(page, 'program-title')).toHaveText(upper('Güç Günü'), { timeout: 30_000 });

    await page.goto('/');
    await app.signOut();
    await app.onboardedUser(makeUser());
    await app.tab('Antrenman').click();
    await app.button('Programlar ve haftalık plan').click();
    await expect(v(page, 'my-programs-empty')).toBeVisible();
  });
});

test.describe('Hazır şablonlar ve başlatma', () => {
  test('hazır boks şablonu: özet, tek dokunuşla başlat; raund saati programdaki planla gelir', async ({ app, page }) => {
    await openPrograms(app, page);
    await v(page, 'program-builtin-boxing-bag').click();
    await expect(v(page, 'program-title')).toHaveText(upper('Boks: 6 raund torba'));
    await expect(v(page, 'program-block-2')).toContainText('6 raund × 3:00 · dinlenme 1:00');
    await app.button('Antrenmanı başlat').click();

    await expect(v(page, 'workout-elapsed')).toBeVisible();
    for (const key of ['jump_rope', 'shadow_boxing', 'heavy_bag_rounds', 'plank']) await expect(v(page, `workout-ex-${key}`)).toBeVisible();
    await expect(v(page, 'workout-ex-heavy_bag_rounds-count')).toHaveText('0/6');
    await v(page, 'workout-ex-heavy_bag_rounds').getByRole('button', { name: 'Raund zamanlayıcısı' }).click();
    await expect(page.getByLabel('Raund: 6', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Raund süresi: 3:00', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Dinlenme: 1:00', { exact: true })).toBeVisible();
  });

  test('hazır şablonu kopyalayıp özelleştir; devam eden antrenman varken başka program başlatılamaz', async ({ app, page }) => {
    await openPrograms(app, page);
    await v(page, 'program-builtin-push').click();
    await app.button('Kopyala ve özelleştir').click();
    await expect(app.field('Program adı')).toHaveValue('Push: göğüs, omuz, triceps');
    await app.field('Program adı').fill('Benim Push');
    await app.button('Programı kaydet').click();
    await expect(v(page, 'program-title')).toHaveText(upper('Benim Push'));
    await app.button('Antrenmanı başlat').click();
    await expect(v(page, 'workout-ex-bench_press')).toBeVisible();
    // Planned values are pre-filled, the warm-up set keeps its type.
    await expect(v(page, 'set-bench_press-1-reps')).toHaveValue('12');
    await expect(v(page, 'set-bench_press-1-kind')).toHaveAttribute('aria-label', 'Set 1: Isınma seti. Türü değiştir');

    // Back to the programs list (the workout keeps running in the background).
    await app.button('Küçült').click();
    await page.goto('/programs');
    await v(page, 'program-builtin-legs').click();
    await app.button('Antrenmanı başlat').click();
    await expect(v(page, 'busy-sheet')).toBeVisible();
    await app.button('Antrenmana dön').click();
    await expect(v(page, 'workout-ex-bench_press')).toBeVisible();
  });

  test('haftalık plan: bugüne atanmış program sekmede çıkar ve tek dokunuşla başlar', async ({ app, page }) => {
    await openPrograms(app, page);
    const today = await todayLong(page);
    await buildProgram(app, page, [today]);
    await app.button('Programı kaydet').click();
    await expect(v(page, 'program-title')).toBeVisible();

    await page.goto('/training');
    await expect(v(page, 'today-program')).toContainText('Güç Günü');
    await app.button('Güç Günü başlat').click();
    await expect(v(page, 'workout-ex-back_squat')).toBeVisible();
    await expect(v(page, 'workout-ex-bench_press')).toBeVisible();
  });

  test('aktif antrenmanda set türü değiştirilebilir', async ({ app, page }) => {
    await app.onboardedUser();
    await app.tab('Antrenman').click();
    await app.checkbox('Fitness').click();
    await app.button('Başlat').click();
    await v(page, 'workout-add').click();
    await page.getByLabel('Ara', { exact: true }).fill('bench');
    await v(page, 'exercise-bench_press').click();
    const kind = v(page, 'set-bench_press-1-kind');
    await kind.click();
    await expect(kind).toHaveAttribute('aria-label', 'Set 1: Isınma seti. Türü değiştir');
    await kind.click();
    await expect(kind).toHaveAttribute('aria-label', 'Set 1: Drop set. Türü değiştir');
    await page.reload();
    await expect(v(page, 'set-bench_press-1-kind')).toHaveAttribute('aria-label', 'Set 1: Drop set. Türü değiştir', { timeout: 30_000 });
  });
});
