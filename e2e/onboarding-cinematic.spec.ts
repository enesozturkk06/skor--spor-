/**
 * Phase 2: cinematic onboarding — intro, directional slides, animated
 * progress, steppers, live preview, resume after reload and the athlete card.
 */
import type { Page } from '@playwright/test';

import { DEFAULT_PROFILE, expect, makeUser, test, type App } from './fixtures';

const stepStyle = (page: Page, step: number) =>
  page.getByTestId(`onboarding-step-${step}`).getAttribute('style').then((s) => s ?? '');
const progressNow = (page: Page) => page.getByTestId('onboarding-progress').getAttribute('aria-valuenow');
const draftKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('onboarding-draft')));

async function toBodyStep(app: App) {
  await app.radio('Boks').click();
  await app.button('Devam et').click();
  await app.button('Bu adımı atla').click();
  await app.checkbox('Güç artışı').click();
  await app.button('Devam et').click();
  await expect(app.text('Fiziksel bilgiler')).toBeVisible();
  for (const label of ['Yaş', 'Boy', 'Kilo']) await expect(app.field(label)).toBeVisible();
}

test.describe('Sinematik onboarding', () => {
  test('giriş ekranı: animasyonlu logo, kişisel karşılama ve adım önizlemesi', async ({ app, page }) => {
    await app.openSignUp();
    await app.fillSignUp(makeUser({ name: 'Deniz Kaya' }));
    await app.button('Hesap oluştur').click();

    await expect(page.getByTestId('onboarding-intro')).toBeVisible();
    await expect(page.getByTestId('animated-logo')).toBeVisible();
    await expect(app.text('Deniz')).toBeVisible();
    for (const s of ['Ana branşın', 'Ek branşların', 'Hedeflerin', 'Fiziksel bilgilerin']) await expect(app.text(s)).toBeVisible();
    await expect(page.getByTestId('onboarding-progress')).toHaveCount(0);

    await app.startOnboarding();
    expect(await progressNow(page)).toBe('1');
  });

  test('adımlar ileri giderken sağdan, geri dönerken soldan kayar; ilerleme dolar', async ({ app, page }) => {
    await app.signUp(makeUser());
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible();
    expect(await stepStyle(page, 2)).toContain('SlideInRight');
    expect(await progressNow(page)).toBe('2');

    await app.button('Bu adımı atla').click();
    expect(await progressNow(page)).toBe('3');
    await app.button('Geri').click();
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible();
    expect(await stepStyle(page, 2)).toContain('SlideInLeft');
    expect(await progressNow(page)).toBe('2');
  });

  test('seçilen kart onay rozeti alır; hedef sayacı güncellenir', async ({ app, page }) => {
    await app.signUp(makeUser());
    await app.radio('Karate').click();
    await expect(app.radio('Karate')).toHaveAttribute('aria-checked', 'true');
    await app.button('Devam et').click();
    await app.button('Bu adımı atla').click();
    await expect(page.getByTestId('goals-count')).toHaveText('0/3 hedef seçildi');
    await app.checkbox('Dayanıklılık').click();
    await app.checkbox('Güç artışı').click();
    await expect(page.getByTestId('goals-count')).toHaveText('2/3 hedef seçildi');
  });

  test('± düğmeleri: boşsa başlangıç değeri, sınırlar içinde adım, sınırda pasif', async ({ app }) => {
    await app.signUp(makeUser());
    await toBodyStep(app);

    await app.button('Yaş artır').click();
    await expect(app.field('Yaş')).toHaveValue('25');
    await app.button('Yaş artır').click();
    await expect(app.field('Yaş')).toHaveValue('26');
    await app.button('Yaş azalt').click();
    await expect(app.field('Yaş')).toHaveValue('25');

    await app.button('Kilo artır').click();
    await expect(app.field('Kilo')).toHaveValue('70');
    await app.button('Kilo artır').click();
    await expect(app.field('Kilo')).toHaveValue('70,5');

    await app.field('Boy').fill('230');
    await expect(app.button('Boy artır')).toBeDisabled();
    await app.field('Yaş').fill('13');
    await expect(app.button('Yaş azalt')).toBeDisabled();
  });

  test('boy ve kilo girilince VKİ anlık önizlenir', async ({ app, page }) => {
    await app.signUp(makeUser());
    await toBodyStep(app);
    await expect(page.getByTestId('bmi-preview')).toHaveCount(0);
    await app.field('Boy').fill('178');
    await app.field('Kilo').fill('75');
    await expect(page.getByTestId('bmi-preview')).toContainText('23,7');
    await expect(page.getByTestId('bmi-preview')).toContainText('Normal');
    await app.field('Kilo').fill('');
    await expect(page.getByTestId('bmi-preview')).toHaveCount(0);
  });

  test('yarıda bırakılan onboarding yenilemeden sonra aynı adımdan, seçimlerle devam eder', async ({ app, page }) => {
    await app.signUp(makeUser());
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await app.checkbox('Fitness').click();
    await app.button('Devam et').click();
    await app.checkbox('Güç artışı').click();
    expect(await draftKeys(page)).toHaveLength(1);

    await page.reload();
    await expect(app.text('Hedeflerin')).toBeVisible();
    await expect(app.button('Başlayalım'), 'no intro when resuming').toHaveCount(0);
    await expect(app.checkbox('Güç artışı')).toHaveAttribute('aria-checked', 'true');
    await app.button('Geri').click();
    await expect(app.checkbox('Fitness')).toHaveAttribute('aria-checked', 'true');
    await app.button('Geri').click();
    await expect(app.radio('Boks')).toHaveAttribute('aria-checked', 'true');

    // Finish from here: the draft is removed once the profile is saved.
    await app.completeOnboarding({ ...DEFAULT_PROFILE, extras: [], goals: [] });
    await app.expectDashboard();
    await expect.poll(() => draftKeys(page)).toHaveLength(0);
  });

  test('sporcu kartı: kişisel bilgiler ve profilden hesaplanan hedefler', async ({ app, page }) => {
    await app.signUp(makeUser({ name: 'Deniz Kaya' }));
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await app.checkbox('Fitness').click();
    await app.button('Devam et').click();
    await app.checkbox('Güç artışı').click();
    await app.button('Devam et').click();
    for (const [label, v] of [['Yaş', '27'], ['Boy', '178'], ['Kilo', '75']]) await app.field(label).fill(v);
    await app.button('Devam et').click();

    await expect(app.text('Sporcu kartın hazır')).toBeVisible();
    const card = page.getByTestId('athlete-card');
    await expect(card).toContainText(/DENİZ KAYA|Deniz Kaya/);
    await expect(card).toContainText(/BOKS|Boks/);
    await expect(card).toContainText('Fitness');
    await expect(card).toContainText('Güç artışı');
    await expect(page.getByTestId('target-minutes')).toHaveText('60 dk'); // combat sport daily target
    await expect(page.getByTestId('target-kcal')).toHaveText('2.330 kcal'); // 75 kg × 31, rounded to 10
    await expect(page.getByTestId('summary-bmi')).toHaveText('23,7');
    expect(await progressNow(page)).toBe('4');

    // Going back keeps every answer.
    await app.button('Geri').click();
    await expect(app.field('Kilo')).toHaveValue('75');
    await app.button('Devam et').click();
    await app.button('Profili oluştur').click();
    await app.expectDashboard();
  });

  test('profil düzenlemede giriş ekranı yok, kart "Kaydet" ile kapanır', async ({ app }) => {
    await app.onboardedUser();
    await app.tab('Profil').click();
    await app.button('Profili düzenle').click();
    await expect(app.text('Ana branşın')).toBeVisible();
    await expect(app.button('Başlayalım')).toHaveCount(0);
    await app.completeOnboarding({ ...DEFAULT_PROFILE, primary: 'Tenis', extras: [], goals: [] }, 'Kaydet');
    await expect(app.text('Profili düzenle')).toBeVisible();
  });
});

test.describe('Sinematik onboarding — Reduce Motion açık', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('adım geçişlerinde kayma animasyonu yapılmaz', async ({ app, page }) => {
    await app.signUp(makeUser());
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible();
    expect(await stepStyle(page, 2)).not.toContain('SlideIn');
  });
});
