/**
 * Phase 3B: training data layer in demo mode, driven through /training-lab
 * (dev/E2E-only harness; the real workout screens arrive in Phase 3C).
 */
import type { Page } from '@playwright/test';

import { DEFAULT_PROFILE, expect, makeUser, test, type App, type TestUser } from './fixtures';

const lab = (page: Page) => ({
  ready: page.getByTestId('lab-ready'),
  active: page.getByTestId('lab-active'),
  message: page.getByTestId('lab-message'),
  history: page.locator('[data-testid^="lab-workout-"]'),
  press: (label: string) => page.getByRole('button', { name: label, exact: true }).click(),
});

async function openLab(page: Page) {
  await page.goto('/training-lab');
  await expect(page.getByTestId('lab-ready')).toHaveText('ready:true', { timeout: 30_000 });
  return lab(page);
}

/** Starts a workout with 2 completed bench sets. Returns the workout id. */
async function buildWorkout(page: Page) {
  const l = lab(page);
  await l.press('Başlat');
  await l.press('Bench ekle');
  await l.press('Seti doldur');
  await l.press('Seti tamamla');
  await l.press('Set ekle');
  await l.press('Seti tamamla');
  await expect(l.active).toContainText('exercises:1 done:2');
  return /active:([0-9a-f-]{36})/.exec((await l.active.textContent()) ?? '')![1];
}

const storageKeys = (page: Page, prefix: string) =>
  page.evaluate((p) => Object.keys(localStorage).filter((k) => k.startsWith(`skorspor:${p}`)), prefix);

async function signInAgain(app: App, user: TestUser) {
  await app.openSignIn();
  await app.signIn(user.email, user.password);
  await app.expectDashboard();
}

test.describe('Antrenman verisi (demo)', () => {
  test('devam eden antrenman yenilemeden sonra kaldığı yerden sürer', async ({ app, page }) => {
    await app.onboardedUser();
    await openLab(page);
    const id = await buildWorkout(page);
    await page.reload();
    const l = lab(page);
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(l.active).toHaveText(`active:${id} exercises:1 done:2`);
    // Saved under this mode and user only.
    expect(await storageKeys(page, 'training-active:')).toEqual([expect.stringMatching(/^skorspor:training-active:demo:/)]);
  });

  test('bitirilen antrenman geçmişe yazılır, taslak silinir ve kalıcıdır', async ({ app, page }) => {
    await app.onboardedUser();
    const l = await openLab(page);
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.message).toHaveText('{"sync":"synced"}');
    await expect(l.active).toHaveText('active:none');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    await page.reload();
    await expect(lab(page).ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    await expect(lab(page).active).toHaveText('active:none');
    expect(await storageKeys(page, 'training-active:')).toEqual([]);
  });

  test('çift dokunuş tek antrenman üretir; boş antrenman bitirilemez', async ({ app, page }) => {
    await app.onboardedUser();
    const l = await openLab(page);
    await l.press('Başlat');
    await l.press('Bench ekle');
    await l.press('Bitir');
    await expect(l.message).toHaveText('error: Bitirmek için en az bir seti tamamla.');
    await expect(l.active).toContainText('exercises:1 done:0');

    await l.press('Seti doldur');
    await l.press('Seti tamamla');
    await l.press('Çift bitir');
    await expect(l.message).toHaveText('["fulfilled","rejected"]');
    await expect(l.history).toHaveCount(1);
  });

  test('antrenman silinir ve silme kalıcıdır', async ({ app, page }) => {
    await app.onboardedUser();
    const l = await openLab(page);
    await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.history).toHaveCount(1);
    await l.press('İlkini sil');
    await expect(l.history).toHaveCount(0);
    await page.reload();
    await expect(lab(page).ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(lab(page).history).toHaveCount(0);
  });

  test('kullanıcılar birbirinin antrenmanını ve taslağını görmez', async ({ app, page }) => {
    const a = makeUser();
    await app.onboardedUser(a);
    let l = await openLab(page);
    const finished = await buildWorkout(page);
    await l.press('Bitir');
    const draft = await buildWorkout(page); // left in progress

    await page.goto('/');
    await app.signOut();
    const b = makeUser();
    await app.onboardedUser(b, { ...DEFAULT_PROFILE, primary: 'Karate' });
    l = await openLab(page);
    await expect(l.active).toHaveText('active:none');
    await expect(l.history).toHaveCount(0);
    await expect(page.getByTestId(`lab-workout-${finished}`)).toHaveCount(0);

    // A's data is back only for A.
    await page.goto('/');
    await app.signOut();
    await signInAgain(app, a);
    l = await openLab(page);
    await expect(page.getByTestId(`lab-workout-${finished}`)).toHaveText('Push Day|synced|2');
    await expect(l.active).toContainText(`active:${draft}`);
  });

  test('bozuk taslak ve geçmiş verisi uygulamayı bozmaz', async ({ app, page }) => {
    await app.onboardedUser();
    await openLab(page);
    await buildWorkout(page);
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('skorspor:training-active:')) localStorage.setItem(k, '{"v":1,"id":"x","exercises":"broken"');
        if (k.startsWith('skorspor:training-active:')) localStorage.setItem(k.replace('training-active', 'training-history'), '[{"id":42},null,"x"]');
      }
    });
    await page.reload();
    const l = lab(page);
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(l.active).toHaveText('active:none');
    await expect(l.history).toHaveCount(0);
    await l.press('Başlat');
    await expect(l.active).toContainText('exercises:0 done:0');
  });
});
