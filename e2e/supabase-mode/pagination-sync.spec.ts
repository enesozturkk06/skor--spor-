/**
 * Long histories in Supabase mode (mock server, never the real project):
 * the history arrives page by page (keyset), completely and without
 * duplicates; records found in the oldest workouts; the score and records
 * never come from partial data; XP is the same after a reinstall / on a new
 * device and never leaks across accounts.
 */
import type { Page } from '@playwright/test';

import type { App } from '../fixtures';

import { PASSWORD, expect, test, uniqueEmail } from './fixtures';
import type { MockSupabase, MockUser } from './mock-supabase';

const v = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const WORKOUTS = '/rest/v1/workouts';

async function signIn(app: App, user: MockUser) {
  await app.openSignIn();
  await app.signIn(user.email, PASSWORD);
  await app.expectDashboard();
}
function newAthlete(mock: MockSupabase) {
  const user = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
  mock.addProfile(user.id);
  return user;
}

test.describe('Supabase modu: uzun geçmiş ve sayfalama', () => {
  test('250 antrenman sayfa sayfa, eksiksiz ve çiftsiz gelir; en eski antrenmandaki rekor bulunur', async ({ app, mock, page }) => {
    const user = newAthlete(mock);
    // The oldest workout (index 0) holds the heaviest bench: 150 kg.
    mock.seedWorkouts(user.id, 250, { benchKg: (i) => (i === 0 ? 150 : 60 + (i % 5)) });
    await signIn(app, user);
    await page.goto('/history');
    await expect(v(page, 'history-summary')).toHaveText('250 antrenman · 11250 dk · 250 set', { timeout: 30_000 });
    await expect(page.getByTestId('history-loading')).toHaveCount(0);

    // Never one big request: first page 50, then pages of at most 100.
    const gets = mock.calls('GET', WORKOUTS);
    const limits = gets.map((r) => Number(r.query.limit));
    expect(Math.max(...limits)).toBeLessThanOrEqual(100);
    expect(gets.filter((r) => !r.query.or).every((r) => r.query.limit === '50')).toBe(true);
    expect(mock.pageRequests).toBeGreaterThanOrEqual(2);

    await page.goto('/records');
    await expect(v(page, 'record-bench_press-weight')).toContainText('150 kg', { timeout: 30_000 });
    await expect(v(page, 'record-bench_press-weight')).toContainText('Seans 1');
  });

  test('aynı anda başlamış 120 antrenmanın hiçbiri atlanmaz ya da tekrarlanmaz', async ({ app, mock, page }) => {
    const user = newAthlete(mock);
    mock.seedWorkouts(user.id, 120, { sameStart: true, startMs: Date.now() - 3 * 86_400_000 });
    await signIn(app, user);
    await page.goto('/history');
    await expect(v(page, 'history-summary')).toHaveText(/^120 antrenman/, { timeout: 30_000 });
    await expect(page.getByTestId('history-loading')).toHaveCount(0);
  });

  test('eski sayfalar gelmezse skor ve rekorlar eksik veriyle gösterilmez; tekrar deneyince tamamlanır', async ({ app, mock, page }) => {
    const user = newAthlete(mock);
    // 80 workouts inside the last 35 days: the first page (50) cannot cover the score window.
    mock.seedWorkouts(user.id, 80, { startMs: Date.now() - 34 * 86_400_000, stepMs: 10 * 3_600_000, benchKg: (i) => (i === 0 ? 140 : 60) });
    mock.failOlderPages = true;
    await signIn(app, user);
    await expect(v(page, 'score-loading')).toBeVisible();
    await expect(page.getByTestId('athlete-score')).toHaveCount(0);

    await page.goto('/records');
    await expect(v(page, 'records-loading')).toContainText('tamamı yüklenemedi', { timeout: 30_000 });
    await expect(page.getByText('140 kg')).toHaveCount(0);

    mock.failOlderPages = false;
    await app.button('Tekrar dene').click();
    await expect(v(page, 'record-bench_press-weight')).toContainText('140 kg', { timeout: 30_000 });
    await page.goto('/');
    await expect(v(page, 'athlete-score')).toBeVisible({ timeout: 30_000 });
  });

  /** A's XP as shown on the records screen (its own element: the level number next to it counts up). */
  async function readXp(page: Page) {
    await page.goto('/records');
    const xp = v(page, 'records-xp');
    await expect(xp).toHaveText(/^[\d.]+ XP$/, { timeout: 30_000 });
    await expect(page.getByTestId('records-loading')).toHaveCount(0);
    return (await xp.textContent())!;
  }

  test('XP: uygulama yeniden kurulunca / yeni cihazda aynı kalır (sunucudaki geçmişten hesaplanır)', async ({ app, mock, page }) => {
    test.setTimeout(90_000);
    const a = newAthlete(mock);
    mock.seedWorkouts(a.id, 60, { benchKg: (i) => 60 + Math.floor(i / 10) }); // 2 pages
    await signIn(app, a);
    const xpA = await readXp(page);
    expect(Number(xpA.replace(/\D/g, ''))).toBeGreaterThan(60 * 50);

    // Reinstall / new device: nothing left on the device, sign in again.
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await signIn(app, a);
    expect(await readXp(page)).toBe(xpA);
  });

  test('XP: başka hesaba geçmez; aynı hesaba dönünce aynıdır', async ({ app, mock, page }) => {
    test.setTimeout(120_000); // three sign-ins
    const a = newAthlete(mock);
    mock.seedWorkouts(a.id, 60, { benchKg: (i) => 60 + Math.floor(i / 10) });
    await signIn(app, a);
    const xpA = await readXp(page);

    await page.goto('/');
    await app.signOut();
    const b = newAthlete(mock);
    await signIn(app, b);
    expect(await readXp(page)).toBe('0 XP');
    await expect(v(page, 'records-empty')).toBeVisible();

    await page.goto('/');
    await app.signOut();
    await signIn(app, a);
    expect(await readXp(page)).toBe(xpA);
  });
});
