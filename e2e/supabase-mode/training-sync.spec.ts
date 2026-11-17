/**
 * Phase 3B in Supabase mode, against the in-browser mock (never the real
 * project): outbox, automatic sync, idempotent retries, session rejection
 * and per-user isolation. The mock enforces the save_workout() rules of the
 * training migration draft, including RLS.
 */
import type { Page } from '@playwright/test';

import type { App } from '../fixtures';

import { PASSWORD, expect, test, uniqueEmail } from './fixtures';
import type { MockSupabase, MockUser } from './mock-supabase';

const SESSION_REJECTED = 'Oturumun sona ermiş olabilir. Lütfen tekrar giriş yap.';
const RPC = '/rest/v1/rpc/save_workout';

const lab = (page: Page) => ({
  ready: page.getByTestId('lab-ready'),
  active: page.getByTestId('lab-active'),
  sync: page.getByTestId('lab-sync'),
  status: page.getByTestId('lab-history-status'),
  error: page.getByTestId('lab-error'),
  message: page.getByTestId('lab-message'),
  history: page.locator('[data-testid^="lab-workout-"]'),
  press: (label: string) => page.getByRole('button', { name: label, exact: true }).click(),
});

async function athlete(app: App, mock: MockSupabase): Promise<MockUser> {
  const user = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
  mock.addProfile(user.id);
  await app.openSignIn();
  await app.signIn(user.email, PASSWORD);
  await app.expectDashboard();
  return user;
}

async function openLab(page: Page) {
  await page.goto('/training-lab');
  await expect(page.getByTestId('lab-ready')).toHaveText('ready:true', { timeout: 30_000 });
  return lab(page);
}

/** Starts and fills a workout with 2 completed sets; returns its id. */
async function buildWorkout(page: Page) {
  const l = lab(page);
  await l.press('Başlat');
  await l.press('Bench ekle');
  await l.press('Seti doldur');
  await l.press('Seti tamamla');
  await l.press('Set ekle');
  await l.press('Seti tamamla');
  await expect(l.active).toContainText('done:2');
  return /active:([0-9a-f-]{36})/.exec((await l.active.textContent()) ?? '')![1];
}

const keys = (page: Page, prefix: string) =>
  page.evaluate((p) => Object.keys(localStorage).filter((k) => k.startsWith(`skorspor:${p}`)), prefix);
const goOnline = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('online')));

test.describe('Supabase modu: antrenman senkronizasyonu', () => {
  test('çevrimiçi: tek RPC ile kaydedilir; kullanıcı kimliği istemciden gönderilmez', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.message).toHaveText('{"sync":"synced"}');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    await expect(l.sync).toHaveText('sync:idle pending:0 rejected:0');

    const calls = mock.calls('POST', RPC);
    expect(calls).toHaveLength(1);
    const body = calls[0].body as { p: Record<string, unknown> };
    expect(body.p.id).toBe(id);
    expect(body.p).not.toHaveProperty('user_id');
    expect(calls[0].auth).toMatch(/^Bearer /);
    expect(mock.workoutsOf(user.id)).toHaveLength(1);
    expect(mock.workoutsOf(user.id)[0].workout_sets).toHaveLength(2);
    expect(await keys(page, 'training-outbox:')).toEqual([]);
  });

  test('çevrimdışı: kuyruğa alınır, yenilemeye dayanır, bağlantı gelince gönderilir', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    mock.trainingWrites = 'network';
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.message).toHaveText('{"sync":"pending"}');
    await expect(l.active).toHaveText('active:none');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|pending|2');
    expect(mock.workoutsOf(user.id)).toHaveLength(0);

    // App closed and reopened while still offline: the queue survives.
    await page.reload();
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|pending|2');
    expect(await keys(page, 'training-outbox:')).toEqual([`skorspor:training-outbox:supabase:${user.id}`]);

    mock.trainingWrites = 'none';
    await goOnline(page);
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    await expect(l.sync).toHaveText('sync:idle pending:0 rejected:0');
    expect(mock.workoutsOf(user.id).map((w) => w.id)).toEqual([id]);
    expect(await keys(page, 'training-outbox:')).toEqual([]);
  });

  test('bağlantı olayı olmadan da artan aralıklarla otomatik tekrar dener', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    mock.trainingWrites = 'server'; // 503: transient
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.sync).toHaveText(/sync:(offline|syncing) pending:1/);
    mock.trainingWrites = 'none';
    // First retry after 3 s, no user action needed.
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2', { timeout: 20_000 });
    expect(mock.workoutsOf(user.id)).toHaveLength(1);
  });

  test('yanıt kaybolsa da tekrar deneme çift kayıt üretmez (idempotent)', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    mock.trainingWrites = 'lost-response'; // stored on the server, answer never arrives
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.message).toHaveText('{"sync":"pending"}');
    expect(mock.workoutsOf(user.id)).toHaveLength(1);

    mock.trainingWrites = 'none';
    await goOnline(page);
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    expect(mock.calls('POST', RPC).length).toBeGreaterThanOrEqual(2); // it really was sent again
    expect(mock.workoutsOf(user.id)).toHaveLength(1);
    await expect(l.history).toHaveCount(1);
  });

  test('çift dokunuş tek istek ve tek kayıt üretir', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    await buildWorkout(page);
    await l.press('Çift bitir');
    await expect(l.message).toHaveText('["fulfilled","rejected"]');
    await expect(l.history).toHaveCount(1);
    expect(mock.calls('POST', RPC)).toHaveLength(1);
    expect(mock.workoutsOf(user.id)).toHaveLength(1);
  });

  test('sunucunun kabul etmediği antrenman sonsuz döngüye girmez, kaybolmaz', async ({ app, mock, page }) => {
    await athlete(app, mock);
    const l = await openLab(page);
    mock.trainingWrites = 'invalid';
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|rejected|2');
    await expect(l.sync).toHaveText('sync:idle pending:0 rejected:1');
    const sent = mock.calls('POST', RPC).length;
    await page.waitForTimeout(4_000); // longer than the first retry delay
    expect(mock.calls('POST', RPC).length, 'no retries of refused data').toBe(sent);
  });

  test('yazmada oturum reddi: kuyruk korunur, otomatik deneme durur, yeniden denenince gider', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    const l = await openLab(page);
    mock.trainingWrites = 'unauthorized';
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.sync).toHaveText('sync:auth pending:0 rejected:0');
    await expect(l.error).toHaveText(`error:${SESSION_REJECTED}`);
    await expect(l.history).toHaveCount(0); // nothing shown under a rejected session
    expect(await keys(page, 'training-outbox:')).toHaveLength(1); // …but nothing lost
    const sent = mock.calls('POST', RPC).length;
    await page.waitForTimeout(4_000);
    expect(mock.calls('POST', RPC).length, 'no automatic retries').toBe(sent);

    mock.trainingWrites = 'none';
    await l.press('Senkronize et');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    expect(mock.workoutsOf(user.id)).toHaveLength(1);
  });

  test('okumada oturum reddi: önbellekteki eski antrenmanlar gösterilmez ve silinir', async ({ app, mock, page }) => {
    await athlete(app, mock);
    const l = await openLab(page);
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
    expect(await keys(page, 'training-history:')).toHaveLength(1);

    mock.trainingReads = 'unauthorized';
    await l.press('Yenile');
    await expect(l.status).toHaveText('history:error');
    await expect(l.error).toHaveText(`error:${SESSION_REJECTED}`);
    await expect(l.history).toHaveCount(0);
    expect(await keys(page, 'training-history:')).toEqual([]);

    // Same after a reload: no stale fallback once the server said no.
    await page.reload();
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(l.history).toHaveCount(0);
  });

  test('okumada ağ hatası: son sunucu kopyası "eski" olarak gösterilir', async ({ app, mock, page }) => {
    await athlete(app, mock);
    const l = await openLab(page);
    const id = await buildWorkout(page);
    await l.press('Bitir');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');

    mock.trainingReads = 'network';
    await page.reload();
    await expect(l.ready).toHaveText('ready:true', { timeout: 30_000 });
    await expect(l.status).toHaveText('history:stale');
    await expect(page.getByTestId(`lab-workout-${id}`)).toHaveText('Push Day|synced|2');
  });

  test('kullanıcı izolasyonu: A’nın kuyruğu B ile gönderilmez, A dönünce A adına gider', async ({ app, mock, page }) => {
    test.setTimeout(120_000); // three sign-ins: long under parallel load
    const a = await athlete(app, mock);
    let l = await openLab(page);
    mock.trainingWrites = 'network';
    const queued = await buildWorkout(page);
    await l.press('Bitir');
    await expect(page.getByTestId(`lab-workout-${queued}`)).toHaveText('Push Day|pending|2');
    const draft = await buildWorkout(page); // and one still in progress

    await page.goto('/');
    await app.signOut();
    mock.trainingWrites = 'none';
    const before = mock.requests.length;
    const b = await athlete(app, mock);
    l = await openLab(page);
    await expect(l.history).toHaveCount(0);
    await expect(l.active).toHaveText('active:none');
    await expect(l.sync).toHaveText('sync:idle pending:0 rejected:0');
    // Nothing of A was sent while B was signed in.
    const sentAsB = mock.requests.slice(before).filter((r) => r.path === RPC);
    expect(sentAsB).toHaveLength(0);
    expect(JSON.stringify(mock.requests.slice(before))).not.toContain(queued);
    // A's offline copy of server data is gone; A's unsent outbox stays under A's id.
    expect(await keys(page, `training-history:supabase:${a.id}`)).toEqual([]);
    expect(await keys(page, `training-outbox:supabase:${a.id}`)).toHaveLength(1);

    await page.goto('/');
    await app.signOut();
    await app.openSignIn();
    await app.signIn(a.email, PASSWORD);
    await app.expectDashboard();
    l = await openLab(page);
    await expect(page.getByTestId(`lab-workout-${queued}`)).toHaveText('Push Day|synced|2', { timeout: 20_000 });
    await expect(l.active).toContainText(`active:${draft}`);
    expect(mock.workoutsOf(a.id).map((w) => w.id)).toEqual([queued]);
    expect(mock.workoutsOf(b.id)).toHaveLength(0);
  });

  test('başka kullanıcının sunucudaki antrenmanı görünmez; silme yalnızca kendi kaydını etkiler', async ({ app, mock, page }) => {
    const other = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
    const foreignId = '99999999-9999-4999-8999-999999999999';
    mock.workouts.set(foreignId, {
      id: foreignId,
      user_id: other.id,
      template_id: null,
      name: 'Gizli',
      sport: 'boxing',
      started_at: new Date(Date.now() - 7200_000).toISOString(),
      ended_at: new Date(Date.now() - 3600_000).toISOString(),
      rpe: null,
      notes: null,
      created_at: new Date().toISOString(),
      workout_sets: [{ exercise_key: 'jab_cross', exercise_name: 'Jab', position: 1, set_index: 1, kind: 'normal', reps: null, weight_kg: null, duration_s: 180, distance_m: null, rest_s: null, rpe: null, completed_at: null }],
    });
    const me = await athlete(app, mock);
    const l = await openLab(page);
    const mine = await buildWorkout(page);
    await l.press('Bitir');
    await expect(l.history).toHaveCount(1);
    await expect(page.getByTestId(`lab-workout-${foreignId}`)).toHaveCount(0);

    await l.press('İlkini sil');
    await expect(l.history).toHaveCount(0);
    expect(mock.workoutsOf(me.id)).toHaveLength(0);
    expect(mock.workouts.has(foreignId), "other athlete's workout untouched").toBe(true);
    const del = mock.calls('DELETE', '/rest/v1/workouts')[0];
    expect(del.query).toMatchObject({ id: `eq.${mine}`, user_id: `eq.${me.id}` });
  });

  test('arayüzden: çevrimdışı bitirilen antrenman sekmede bekliyor görünür, bağlantı gelince kaydedilir', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    await app.tab('Antrenman').click();
    await app.button('Başlat').click();
    const v = (id: string) => page.getByTestId(id).filter({ visible: true });
    await v('workout-add').click();
    await page.getByLabel('Ara', { exact: true }).fill('jab');
    await v('exercise-jab_cross').click();
    await v('set-jab_cross-1-durationS').fill('3');
    await v('set-jab_cross-1-done').click();
    mock.trainingWrites = 'network';
    await app.button('Bitir').click();
    await app.button('Antrenmanı kaydet').click();
    await app.button('Devam').click(); // completion screen (Phase 3E) → training tab

    await expect(v('last-workout')).toContainText('GÖNDERİLMEYİ BEKLİYOR');
    await expect(v('pending-banner')).toContainText('1 antrenman');
    expect(mock.workoutsOf(user.id)).toHaveLength(0);

    mock.trainingWrites = 'none';
    await goOnline(page);
    await expect(v('last-workout')).toContainText('KAYDEDİLDİ');
    await expect(v('pending-banner')).toHaveCount(0);
    const [saved] = mock.workoutsOf(user.id);
    expect(saved.workout_sets).toEqual([expect.objectContaining({ exercise_key: 'jab_cross', duration_s: 180, position: 1, set_index: 1 })]);
  });
});
