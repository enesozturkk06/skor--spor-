/**
 * Phase 1 loading states in Supabase mode (mock backend): skeleton while the
 * profile loads, and background refresh that never wipes the screen.
 */
import { PASSWORD, expect, test, uniqueEmail } from './fixtures';
import type { MockSupabase } from './mock-supabase';

async function signedInWithProfile(app: import('../fixtures').App, mock: MockSupabase) {
  const email = uniqueEmail();
  const user = mock.addUser({ email, password: PASSWORD });
  mock.addProfile(user.id, { primary_sport: 'boxing' });
  await app.openSignIn();
  return { email, user };
}

test.describe('Supabase modu: yükleme ve yenileme', () => {
  test('profil yüklenirken panel iskeleti görünür, sonra panel gelir', async ({ app, mock, page }) => {
    const { email } = await signedInWithProfile(app, mock);
    mock.profileReadDelayMs = 1500;
    await app.signIn(email, PASSWORD);
    const skeleton = page.getByRole('progressbar', { name: 'Performans panelin yükleniyor' });
    await expect(skeleton).toBeVisible();
    await app.expectDashboard();
    await expect(skeleton).toHaveCount(0);
  });

  test('Yenile sunucudaki güncel profili getirir', async ({ app, mock, page }) => {
    const { email, user } = await signedInWithProfile(app, mock);
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();
    await expect(page.getByText('Boks sporcusu')).toBeVisible();

    const readsBefore = mock.calls('GET', '/rest/v1/athlete_profiles').length;
    mock.profiles.get(user.id)!.primary_sport = 'tennis'; // changed elsewhere (e.g. another device)
    await app.button('Yenile').click();
    await expect(page.getByText('Tenis sporcusu')).toBeVisible();
    expect(mock.calls('GET', '/rest/v1/athlete_profiles').length).toBe(readsBefore + 1);
    // Background refresh: no skeleton, the dashboard never left the screen.
    await expect(page.getByRole('progressbar', { name: 'Performans panelin yükleniyor' })).toHaveCount(0);
  });

  test('yenileme ağ hatasında ekran korunur ve uyarı gösterilir', async ({ app, mock, page }) => {
    const { email } = await signedInWithProfile(app, mock);
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();

    mock.profileReads = 'network';
    await app.button('Yenile').click();
    await expect(page.getByText(/Sunucuya ulaşılamıyor/)).toBeVisible();
    await app.expectDashboard();
    await expect(page.getByText('Boks sporcusu')).toBeVisible();
  });

  test('yenilemede oturum reddedilirse eski profil gösterilmez', async ({ app, mock, page }) => {
    const { email } = await signedInWithProfile(app, mock);
    await app.signIn(email, PASSWORD);
    await app.expectDashboard();

    mock.profileReads = 'unauthorized';
    await app.button('Yenile').click();
    await expect(app.text('Profilin yüklenemedi')).toBeVisible();
    await expect(page.getByText('Oturumun sona ermiş olabilir. Lütfen tekrar giriş yap.')).toBeVisible();
    await expect(page.getByText(/Sunucuya ulaşılamıyor/)).toHaveCount(0);
  });
});
