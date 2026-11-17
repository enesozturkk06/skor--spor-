/**
 * Phase 3E in Supabase mode, against the in-browser mock (never the real
 * project): deleting workouts works offline through a deletion queue, never
 * resurrects a deleted workout, never deletes another athlete's data, and
 * stays with its owner across account switches.
 */
import type { Page } from '@playwright/test';

import type { App } from '../fixtures';

import { PASSWORD, expect, test, uniqueEmail } from './fixtures';
import type { MockSupabase, MockUser } from './mock-supabase';

const lab = (page: Page) => ({
  ready: page.getByTestId('lab-ready'),
  active: page.getByTestId('lab-active'),
  history: page.locator('[data-testid^="lab-workout-"]'),
  press: (label: string) => page.getByRole('button', { name: label, exact: true }).click(),
});

async function signIn(app: App, user: MockUser) {
  await app.openSignIn();
  await app.signIn(user.email, PASSWORD);
  await app.expectDashboard();
}

async function athlete(app: App, mock: MockSupabase): Promise<MockUser> {
  const user = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
  mock.addProfile(user.id);
  await signIn(app, user);
  return user;
}

async function openLab(page: Page) {
  await page.goto('/training-lab');
  await expect(page.getByTestId('lab-ready')).toHaveText('ready:true', { timeout: 30_000 });
  return lab(page);
}

/** Finishes a workout with 2 bench sets through the lab; returns its id. */
async function finishWorkout(page: Page) {
  const l = lab(page);
  for (const b of ['Başlat', 'Bench ekle', 'Seti doldur', 'Seti tamamla', 'Set ekle', 'Seti tamamla']) await l.press(b);
  const id = /active:([0-9a-f-]{36})/.exec((await l.active.textContent()) ?? '')![1];
  await l.press('Bitir');
  await expect(l.active).toHaveText('active:none');
  return id;
}

const deletesKey = (page: Page) =>
  page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('skorspor:training-deletes:'));
    return k ? (JSON.parse(localStorage.getItem(k)!) as string[]) : [];
  });
const goOnline = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('online')));
const DEL = '/rest/v1/workouts';

test.describe('Supabase modu: geçmiş ve silme', () => {
  test('çevrimdışı silme: hemen kaybolur, kuyruğa girer, yenilemede geri gelmez, bağlantı gelince sunucudan silinir', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    const id = await finishWorkout(page);
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');

    mock.trainingWrites = 'network';
    await l.press('İlkini sil');
    await expect(l.history).toHaveCount(0);
    expect(mock.workoutsOf(user.id)).toHaveLength(1); // still on the server
    expect(await deletesKey(page)).toEqual([id]);

    await page.reload(); // the server copy must not come back
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(l.history).toHaveCount(0);

    mock.trainingWrites = 'none';
    await goOnline(page);
    await expect.poll(() => mock.workoutsOf(user.id).length).toBe(0);
    await expect.poll(() => deletesKey(page)).toEqual([]);
    const del = mock.calls('DELETE', DEL).at(-1)!;
    expect(del.query).toMatchObject({ id: `eq.${id}`, user_id: `eq.${user.id}` });
  });

  test('yanıtı kaybolmuş (sunucuya ulaşmış olabilecek) antrenman silinince sunucudan da silinir', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    mock.trainingWrites = 'lost-response';
    const id = await finishWorkout(page);
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|pending|2');
    expect(mock.workoutsOf(user.id)).toHaveLength(1);

    mock.trainingWrites = 'none';
    await l.press('İlkini sil');
    await expect(l.history).toHaveCount(0);
    await expect.poll(() => mock.workoutsOf(user.id).length).toBe(0);
    await page.reload();
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(l.history).toHaveCount(0);
  });

  test('hesap değişimi: A’nın bekleyen silmesi B ile gönderilmez; A dönünce A adına gider', async ({ app, mock, page }) => {
    test.setTimeout(120_000); // three sign-ins, a reload and a workout: long under parallel load
    const a = await athlete(app, mock);
    const l = await openLab(page);
    const id = await finishWorkout(page);
    mock.trainingWrites = 'network';
    await l.press('İlkini sil');
    await expect(l.history).toHaveCount(0);

    await page.goto('/');
    await app.signOut();
    mock.trainingWrites = 'none';
    const before = mock.requests.length;
    await athlete(app, mock);
    await openLab(page);
    await page.waitForTimeout(1500);
    const asB = mock.requests.slice(before);
    expect(asB.filter((r) => r.method === 'DELETE'), 'B never sends A’s deletion').toHaveLength(0);
    expect(JSON.stringify(asB)).not.toContain(id);
    expect(mock.workoutsOf(a.id)).toHaveLength(1);

    await page.goto('/');
    await app.signOut();
    await signIn(app, a);
    await expect.poll(() => mock.workoutsOf(a.id).length, { timeout: 20_000 }).toBe(0);
  });

  test('geçmiş ve rekorlar başka kullanıcının sunucudaki antrenmanını göstermez', async ({ app, mock, page }) => {
    const other = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
    const foreign = '99999999-9999-4999-8999-999999999997';
    const start = new Date(Date.now() - 2 * 86_400_000).toISOString();
    mock.workouts.set(foreign, {
      id: foreign,
      user_id: other.id,
      template_id: null,
      name: 'Başkasının seansı',
      sport: 'fitness',
      started_at: start,
      ended_at: new Date(Date.parse(start) + 3_600_000).toISOString(),
      rpe: null,
      notes: null,
      created_at: start,
      workout_sets: [{ exercise_key: 'bench_press', exercise_name: 'Düz Bench Press', position: 1, set_index: 1, kind: 'normal', reps: 1, weight_kg: 200, duration_s: null, distance_m: null, rest_s: null, rpe: null, completed_at: null }],
    });
    await athlete(app, mock);
    await openLab(page);
    await finishWorkout(page);
    await page.goto('/history');
    await expect(page.getByTestId('history-summary').filter({ visible: true })).toHaveText(/^1 antrenman/, { timeout: 30_000 });
    await expect(page.getByText('Başkasının seansı')).toHaveCount(0);
    await page.goto('/records');
    await expect(page.getByTestId('record-bench_press-weight').filter({ visible: true })).toContainText('60 kg');
    await expect(page.getByText('200 kg')).toHaveCount(0);
  });
});
