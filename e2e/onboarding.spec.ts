import { expect, makeUser, test } from './fixtures';

test.describe('Sporcu onboarding', () => {
  test.beforeEach(async ({ app }) => {
    await app.signUp(makeUser());
  });

  test('11 spor branşının hepsi listelenir', async ({ app }) => {
    const sports = ['Fitness', 'Bodybuilding', 'Boks', 'Kickboks', 'Karate', 'Futbol', 'Basketbol', 'Voleybol', 'Koşu', 'Yüzme', 'Tenis'];
    for (const s of sports) await expect(app.radio(s)).toBeAttached();
  });

  test('ana branş seçilmeden devam edilemez ve seçim tektir', async ({ app }) => {
    await expect(app.button('Devam et')).toBeDisabled();
    await app.radio('Boks').click();
    await app.radio('Tenis').click();
    await expect(app.radio('Tenis')).toHaveAttribute('aria-checked', 'true');
    await expect(app.radio('Boks')).toHaveAttribute('aria-checked', 'false');
    await expect(app.button('Devam et')).toBeEnabled();
  });

  test('ek branşlarda ana branş gizlenir, en fazla 4 seçilir ve adım atlanabilir', async ({ app }) => {
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await expect(app.button('Bu adımı atla')).toBeVisible();
    await expect(app.checkbox('Boks')).toHaveCount(0);

    for (const s of ['Fitness', 'Koşu', 'Yüzme', 'Karate']) await app.checkbox(s).click();
    await expect(app.page.getByText('4/4 seçildi · İsteğe bağlı')).toBeVisible();
    await expect(app.checkbox('Tenis')).toBeDisabled();

    await app.checkbox('Karate').click();
    await expect(app.checkbox('Tenis')).toBeEnabled();
  });

  test('en az 1, en fazla 3 hedef seçilebilir', async ({ app }) => {
    await app.radio('Futbol').click();
    await app.button('Devam et').click();
    await app.button('Bu adımı atla').click();
    await expect(app.text('Hedeflerin')).toBeVisible();
    await expect(app.button('Devam et')).toBeDisabled();

    for (const g of ['Güç artışı', 'Dayanıklılık', 'Müsabaka hazırlığı']) await app.checkbox(g).click();
    await expect(app.checkbox('Yağ yakımı')).toBeDisabled();
    await expect(app.button('Devam et')).toBeEnabled();
  });

  test('geri gidildiğinde seçimler korunur', async ({ app }) => {
    await app.radio('Karate').click();
    await app.button('Devam et').click();
    await app.checkbox('Fitness').click();
    await app.button('Devam et').click();
    await app.button('Geri').click();
    await expect(app.checkbox('Fitness')).toHaveAttribute('aria-checked', 'true');
    await app.button('Geri').click();
    await expect(app.radio('Karate')).toHaveAttribute('aria-checked', 'true');
  });

  test('fiziksel bilgiler aralık dışıysa kayıt yapılmaz', async ({ app }) => {
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await app.button('Bu adımı atla').click();
    await app.checkbox('Güç artışı').click();
    await app.button('Devam et').click();

    await app.button('Profili oluştur').click();
    await expect(app.text('Yaş gerekli.')).toBeVisible();
    await expect(app.text('Boy gerekli.')).toBeVisible();
    await expect(app.text('Kilo gerekli.')).toBeVisible();

    await app.field('Yaş').fill('9');
    await app.field('Boy').fill('300');
    await app.field('Kilo').fill('20');
    await app.button('Profili oluştur').click();
    await expect(app.text('Yaş 13–90 arasında olmalı.')).toBeVisible();
    await expect(app.text('Boy 120–230 arasında olmalı.')).toBeVisible();
    await expect(app.text('Kilo 30–250 arasında olmalı.')).toBeVisible();
    await expect(app.text('Athlete Score')).toHaveCount(0);
  });

  test('sayısal alanlar harf kabul etmez', async ({ app }) => {
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await app.button('Bu adımı atla').click();
    await app.checkbox('Güç artışı').click();
    await app.button('Devam et').click();
    // Typed key by key like a real user; non-digits are dropped.
    await app.field('Yaş').pressSequentially('2a7');
    await expect(app.field('Yaş')).toHaveValue('27');
    await app.field('Kilo').pressSequentially('7x5,5');
    await expect(app.field('Kilo')).toHaveValue('75,5');
  });

  test('tamamlanan onboarding dashboard açar', async ({ app }) => {
    await app.completeOnboarding();
    await app.expectDashboard();
  });
});
