/**
 * Phase 3D programs in Supabase mode, against the in-browser mock (never the
 * real project). The mock applies the planned workout_templates rules: RLS,
 * checks (goal, days), and the workouts → template foreign key.
 */
import type { Page } from '@playwright/test';

import type { App } from '../fixtures';

import { PASSWORD, expect, test, uniqueEmail } from './fixtures';
import type { MockSupabase, MockUser } from './mock-supabase';

const v = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const TABLE = '/rest/v1/workout_templates';

async function athlete(app: App, mock: MockSupabase): Promise<MockUser> {
  const user = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
  mock.addProfile(user.id);
  await app.openSignIn();
  await app.signIn(user.email, PASSWORD);
  await app.expectDashboard();
  return user;
}

/** New program "Sabah" (Fitness, Güç, Pazartesi) with one bench block, saved. */
async function saveProgram(app: App, page: Page) {
  await page.goto('/programs/edit');
  await app.field('Program adı').fill('Sabah');
  await app.checkbox('Fitness').click();
  await app.checkbox('Güç').click();
  await app.checkbox('Pazartesi').click();
  await v(page, 'program-add-exercise').click();
  const picker = page.getByTestId('program-picker');
  await picker.getByLabel('Ara', { exact: true }).fill('bench');
  await picker.getByTestId('exercise-bench_press').click();
  await app.button('Programı kaydet').click();
  await expect(v(page, 'program-title')).toHaveText('SABAH', { timeout: 30_000 });
}

test.describe('Supabase modu: programlar', () => {
  test('kaydedilen program tabloya doğru biçimde gider (sahip, hedef, günler, bloklar)', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    await saveProgram(app, page);
    await expect.poll(() => mock.templatesOf(user.id).length).toBe(1);
    const [row] = mock.templatesOf(user.id);
    expect(row).toMatchObject({ user_id: user.id, name: 'Sabah', sport: 'fitness', goal: 'strength', days: [1] });
    expect(row.blocks).toEqual([
      expect.objectContaining({ exercise_key: 'bench_press', rest_s: 90, rounds: null, sets: [expect.objectContaining({ kind: 'normal', reps: 10 }), expect.anything(), expect.anything()] }),
    ]);
    const post = mock.calls('POST', TABLE)[0];
    expect(post.query.on_conflict).toBe('id');
  });

  test('çevrimdışı kaydedilen program cihazda kalır; sonraki yüklemede sunucuya gider', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    mock.templateWrites = 'network';
    await saveProgram(app, page);
    expect(mock.templatesOf(user.id)).toHaveLength(0);
    await page.goto('/programs');
    await expect(v(page, 'my-programs')).toContainText('Sabah');

    mock.templateWrites = 'none';
    await page.reload();
    await expect(v(page, 'my-programs')).toContainText('Sabah', { timeout: 30_000 });
    await expect.poll(() => mock.templatesOf(user.id).length).toBe(1);
  });

  test('sunucuya ulaşmamış programdan yapılan antrenman yabancı anahtar hatasına düşmez', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    mock.templateWrites = 'network'; // program stays local
    await saveProgram(app, page);
    await app.button('Antrenmanı başlat').click();
    await v(page, 'set-bench_press-1-done').click();
    await app.button('Bitir').click();
    await app.button('Antrenmanı kaydet').click();
    await app.button('Devam').click(); // completion screen (Phase 3E) → training tab
    await expect(v(page, 'last-workout')).toContainText('KAYDEDİLDİ');
    const [saved] = mock.workoutsOf(user.id);
    expect(saved.template_id, 'unsynced program is sent as "no program"').toBeNull();
  });

  test('senkronize programdan yapılan antrenman programa bağlanır', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    await saveProgram(app, page);
    await expect.poll(() => mock.templatesOf(user.id).length).toBe(1);
    const programId = mock.templatesOf(user.id)[0].id;
    await app.button('Antrenmanı başlat').click();
    await v(page, 'set-bench_press-1-done').click();
    await app.button('Bitir').click();
    await app.button('Antrenmanı kaydet').click();
    await app.button('Devam').click(); // completion screen (Phase 3E) → training tab
    await expect(v(page, 'last-workout')).toContainText('KAYDEDİLDİ');
    expect(mock.workoutsOf(user.id)[0].template_id).toBe(programId);
  });

  test('başka kullanıcının programı görünmez; silme yalnızca kendi kaydını siler', async ({ app, mock, page }) => {
    const other = mock.addUser({ email: uniqueEmail(), password: PASSWORD });
    const foreign = '99999999-9999-4999-8999-999999999998';
    const now = new Date().toISOString();
    mock.templates.set(foreign, { id: foreign, user_id: other.id, name: 'Gizli plan', sport: 'boxing', goal: null, notes: null, days: [1], blocks: [], created_at: now, updated_at: now });
    const me = await athlete(app, mock);
    await saveProgram(app, page);
    await expect.poll(() => mock.templatesOf(me.id).length).toBe(1);
    await page.goto('/programs');
    await expect(v(page, 'my-programs')).not.toContainText('Gizli plan');

    await v(page, `program-${mock.templatesOf(me.id)[0].id}`).click();
    await app.button('Programı sil').click();
    await app.button('Evet, sil').click();
    await expect(v(page, 'my-programs-empty')).toBeVisible();
    await expect.poll(() => mock.templatesOf(me.id).length).toBe(0);
    expect(mock.templates.has(foreign), "other athlete's program untouched").toBe(true);
    expect(mock.calls('DELETE', TABLE)[0].query).toMatchObject({ user_id: `eq.${me.id}` });
  });

  test('oturum reddinde programlar gösterilmez ve cihaz kopyası silinir', async ({ app, mock, page }) => {
    const user = await athlete(app, mock);
    await saveProgram(app, page);
    await expect.poll(() => mock.templatesOf(user.id).length).toBe(1);
    mock.templateReads = 'unauthorized';
    await page.goto('/programs');
    await expect(page.getByText('Programların yüklenemedi', { exact: false }).filter({ visible: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Sabah', { exact: true }).filter({ visible: true })).toHaveCount(0);
    const stored = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('skorspor:training-templates:'));
      return key ? JSON.parse(localStorage.getItem(key)!).items.length : 0;
    });
    expect(stored).toBe(0);
  });
});
