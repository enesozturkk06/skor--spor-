/**
 * Supabase mode: onboarding progress is kept across reloads but never
 * outlives the session on a shared device.
 */
import { PASSWORD, expect, test, uniqueEmail } from './fixtures';

const draftKeys = (page: import('@playwright/test').Page) =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('onboarding-draft')));

test.describe('Supabase modu: onboarding taslağı', () => {
  test('yenilemede korunur, oturum sona erince cihazdan silinir', async ({ app, mock, page, baseURL }) => {
    const email = uniqueEmail();
    mock.addUser({ email, password: PASSWORD, confirmed: false });
    await page.goto(mock.confirmationLink(email, baseURL!));
    await app.startOnboarding();
    await app.radio('Yüzme').click();
    await app.button('Devam et').click();
    expect(await draftKeys(page)).toEqual([expect.stringContaining('onboarding-draft:supabase:')]);

    await page.reload();
    await expect(app.text('Ek branşlar')).toBeVisible();
    await app.button('Geri').click();
    await expect(app.radio('Yüzme')).toHaveAttribute('aria-checked', 'true');
    // Nothing reaches the server before the athlete confirms the card.
    expect(mock.calls('POST', '/rest/v1/athlete_profiles')).toHaveLength(0);

    mock.revokeAllSessions();
    await page.reload();
    await expect(app.button('Hemen başla')).toBeVisible();
    await expect.poll(() => draftKeys(page)).toEqual([]);
  });
});
