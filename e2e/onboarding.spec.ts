import { expect, makeUser, test, type App } from './fixtures';

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

    await app.button('Devam et').click();
    await expect(app.text('Yaş gerekli.')).toBeVisible();
    await expect(app.text('Boy gerekli.')).toBeVisible();
    await expect(app.text('Kilo gerekli.')).toBeVisible();

    await app.field('Yaş').fill('9');
    await app.field('Boy').fill('300');
    await app.field('Kilo').fill('20');
    await app.button('Devam et').click();
    await expect(app.text('Yaş 13–90 arasında olmalı.')).toBeVisible();
    await expect(app.text('Boy 120–230 arasında olmalı.')).toBeVisible();
    await expect(app.text('Kilo 30–250 arasında olmalı.')).toBeVisible();
    await expect(app.text('Athlete Score')).toHaveCount(0);
  });

  test('tamamlanan onboarding dashboard açar', async ({ app }) => {
    await app.completeOnboarding();
    await app.expectDashboard();
  });
});

test.describe('Fiziksel bilgi alanları: yazma ve yapıştırma', () => {
  test.beforeEach(async ({ app }) => {
    await app.signUp(makeUser());
    await app.radio('Boks').click();
    await app.button('Devam et').click();
    await app.button('Bu adımı atla').click();
    await app.checkbox('Güç artışı').click();
    await app.button('Devam et').click();
    await expect(app.text('Fiziksel bilgiler')).toBeVisible();
    // Fields enter one after another and are hidden until their entrance starts;
    // keystrokes sent to a hidden input are dropped, so wait until all are shown.
    for (const label of ['Yaş', 'Boy', 'Kilo']) await expect(app.field(label)).toBeVisible();
  });

  /** Replaces the field content in one input event, like a paste or autofill. */
  async function paste(app: App, label: string, text: string) {
    const field = app.field(label);
    await field.click();
    await field.selectText();
    await app.page.keyboard.insertText(text);
  }

  test('yazılan geçersiz karakter reddedilir, önceki değer ve açıklama kalır', async ({ app }) => {
    const age = app.field('Yaş');
    await age.pressSequentially('2');
    await age.pressSequentially('a');
    await expect(age).toHaveValue('2');
    await expect(app.text('Yalnızca rakam girebilirsin.')).toBeVisible();

    await age.pressSequentially('7');
    await expect(age).toHaveValue('27');
    await expect(app.text('Yalnızca rakam girebilirsin.')).toHaveCount(0);

    const weight = app.field('Kilo');
    await weight.pressSequentially('7x5,5');
    await expect(weight).toHaveValue('75,5');
  });

  test('maksimum uzunluk yazarken de korunur', async ({ app }) => {
    await app.field('Yaş').pressSequentially('275');
    await expect(app.field('Yaş')).toHaveValue('27');
    await app.field('Boy').pressSequentially('1789');
    await expect(app.field('Boy')).toHaveValue('178');
    await expect(app.text('En fazla 3 basamak girebilirsin.')).toBeVisible();
    await app.field('Kilo').pressSequentially('75,55');
    await expect(app.field('Kilo')).toHaveValue('75,5');
    await expect(app.text('Virgülden sonra en fazla 1 basamak girebilirsin.')).toBeVisible();
  });

  test('Türkçe virgül ve nokta ondalık ayırıcı olarak çalışır', async ({ app }) => {
    await app.field('Kilo').pressSequentially('81.5');
    await expect(app.field('Kilo')).toHaveValue('81.5');
    await app.field('Kilo').fill('');
    await app.field('Kilo').pressSequentially('81,5');
    await expect(app.field('Kilo')).toHaveValue('81,5');
  });

  test('birimli veya boşluklu yapıştırma temizlenir', async ({ app }) => {
    await paste(app, 'Yaş', ' 27 yaş ');
    await expect(app.field('Yaş')).toHaveValue('27');
    await paste(app, 'Boy', '178 cm');
    await expect(app.field('Boy')).toHaveValue('178');
    await paste(app, 'Kilo', '75,5 kg');
    await expect(app.field('Kilo')).toHaveValue('75,5');
  });

  test('belirsiz yapıştırma sessizce başka bir sayıya dönüşmez', async ({ app }) => {
    const height = app.field('Boy');
    await height.pressSequentially('180');

    await paste(app, 'Boy', '1.78'); // meters — must not become 178
    await expect(height).toHaveValue('180');
    await expect(app.text('Yalnızca rakam girebilirsin.')).toBeVisible();

    await paste(app, 'Boy', '1780'); // must not be truncated to 178
    await expect(height).toHaveValue('180');
    await expect(app.text('En fazla 3 basamak girebilirsin.')).toBeVisible();

    await paste(app, 'Yaş', '2a7');
    await expect(app.field('Yaş')).toHaveValue('');

    const weight = app.field('Kilo');
    await weight.pressSequentially('80');
    for (const bad of ['75,55', '7,5,5', 'abc', '-75']) {
      await paste(app, 'Kilo', bad);
      await expect(weight, bad).toHaveValue('80');
    }
  });

  test('gerçek pano ile yapıştırma (Ctrl+V)', async ({ app, context, page, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
    const pasteFromClipboard = async (label: string, text: string) => {
      await page.evaluate((t) => navigator.clipboard.writeText(t), text);
      const field = app.field(label);
      await field.click();
      await field.selectText();
      await page.keyboard.press('ControlOrMeta+V');
    };

    await pasteFromClipboard('Kilo', ' 81,5 kg ');
    await expect(app.field('Kilo')).toHaveValue('81,5');
    await pasteFromClipboard('Yaş', '1a2b');
    await expect(app.field('Yaş')).toHaveValue('');
    await expect(app.text('Yalnızca rakam girebilirsin.')).toBeVisible();
  });

  test('temizlenen değerler profile doğru kaydedilir', async ({ app, page }) => {
    await paste(app, 'Yaş', '27 yaş');
    await paste(app, 'Boy', '178 cm');
    await paste(app, 'Kilo', '75,5 kg');
    await app.button('Devam et').click();
    await app.button('Profili oluştur').click();
    await app.expectDashboard();
    await app.tab('Profil').click();
    await expect(page.getByText('27 yıl', { exact: true })).toBeVisible();
    await expect(page.getByText('178 cm', { exact: true })).toBeVisible();
    await expect(page.getByText('75,5 kg', { exact: true })).toBeVisible();
    await expect(page.getByText('23,8', { exact: true })).toBeVisible(); // VKİ: 75,5 / 1,78²
  });

  test('aralık kontrolleri temizlemeden sonra da çalışır', async ({ app }) => {
    await paste(app, 'Yaş', '9 yaş');
    await paste(app, 'Boy', '300 cm');
    await paste(app, 'Kilo', '20 kg');
    await app.button('Devam et').click();
    await expect(app.text('Yaş 13–90 arasında olmalı.')).toBeVisible();
    await expect(app.text('Boy 120–230 arasında olmalı.')).toBeVisible();
    await expect(app.text('Kilo 30–250 arasında olmalı.')).toBeVisible();
  });
});
