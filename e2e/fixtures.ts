import { test as base, expect, type Locator, type Page } from '@playwright/test';

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches a label whether it renders as written or uppercased with the
 * tr-TR locale (AppText uppercases display/overline styles: "Seri" → "SERİ").
 */
export function byText(page: Page, text: string): Locator {
  const upper = text.toLocaleUpperCase('tr-TR');
  // Inactive tabs stay mounted but hidden — only visible matches count.
  return page
    .getByText(new RegExp(`^(${escapeRe(text)}|${escapeRe(upper)})$`))
    .filter({ visible: true })
    .first();
}

/** Regex alternative of the tr-TR uppercased forms (the `i` flag does not fold İ/ı). */
export function upperAlternatives(options: string[]): string {
  return options.map((o) => escapeRe(o.toLocaleUpperCase('tr-TR'))).join('|');
}

/* ------------------------------------------------------------------ */
/* Test data                                                           */
/* ------------------------------------------------------------------ */

export type TestUser = { name: string; email: string; password: string };

export type TestProfile = {
  primary: string;
  extras: string[];
  goals: string[];
  age: string;
  height: string;
  weight: string;
};

let counter = 0;
export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  counter += 1;
  return {
    name: 'Deniz Kaya',
    email: `athlete${Date.now()}${counter}@example.com`,
    password: 'guclu1234',
    ...overrides,
  };
}

export const DEFAULT_PROFILE: TestProfile = {
  primary: 'Boks',
  extras: ['Fitness', 'Koşu'],
  goals: ['Güç artışı', 'Branş performansı'],
  age: '27',
  height: '178',
  weight: '75',
};

/* ------------------------------------------------------------------ */
/* Page driver: user-level actions, no implementation details          */
/* ------------------------------------------------------------------ */

export class App {
  constructor(readonly page: Page) {}

  text(t: string) {
    return byText(this.page, t);
  }
  button(name: string) {
    return this.page.getByRole('button', { name, exact: true });
  }
  radio(name: string) {
    return this.page.getByRole('radio', { name, exact: true });
  }
  checkbox(name: string) {
    return this.page.getByRole('checkbox', { name, exact: true });
  }
  tab(name: string) {
    return this.page.getByRole('tab', { name, exact: true });
  }
  field(label: string) {
    return this.page.getByLabel(label, { exact: true });
  }

  async openWelcome() {
    await this.page.goto('/');
    await expect(this.button('Hemen başla')).toBeVisible({ timeout: 45_000 });
  }

  async openSignUp() {
    await this.openWelcome();
    await this.button('Hemen başla').click();
    await expect(this.button('Hesap oluştur')).toBeVisible();
  }

  async openSignIn() {
    await this.openWelcome();
    await this.button('Giriş yap').click();
    await expect(this.text('Tekrar hoş geldin')).toBeVisible();
  }

  async fillSignUp(user: TestUser) {
    await this.field('Ad Soyad').fill(user.name);
    await this.field('E-posta').fill(user.email);
    await this.field('Şifre').fill(user.password);
  }

  /** Signs up and waits for the first onboarding step. */
  async signUp(user: TestUser) {
    await this.openSignUp();
    await this.fillSignUp(user);
    await this.button('Hesap oluştur').click();
    await expect(this.text('Ana branşın')).toBeVisible();
  }

  /**
   * The sign-in submit button. The welcome screen (also with a "Giriş yap"
   * button) stays mounted underneath in the stack, so take the top-most one.
   */
  signInSubmit() {
    return this.button('Giriş yap').last();
  }

  async signIn(email: string, password: string) {
    await this.field('E-posta').fill(email);
    await this.field('Şifre').fill(password);
    await this.signInSubmit().click();
  }

  /** Walks the 4 onboarding steps. `submitLabel` is "Kaydet" in edit mode. */
  async completeOnboarding(profile: TestProfile = DEFAULT_PROFILE, submitLabel = 'Profili oluştur') {
    await this.radio(profile.primary).click();
    await this.button('Devam et').click();

    await expect(this.text('Ek branşlar')).toBeVisible();
    for (const s of profile.extras) await this.checkbox(s).click();
    // Label is "Bu adımı atla" when nothing is selected (also depends on prefilled data in edit mode).
    await this.page.getByRole('button', { name: /^(Devam et|Bu adımı atla)$/ }).click();

    await expect(this.text('Hedeflerin')).toBeVisible();
    for (const g of profile.goals) await this.checkbox(g).click();
    await this.button('Devam et').click();

    await expect(this.text('Fiziksel bilgiler')).toBeVisible();
    await this.field('Yaş').fill(profile.age);
    await this.field('Boy').fill(profile.height);
    await this.field('Kilo').fill(profile.weight);
    await this.button(submitLabel).click();
  }

  async expectDashboard() {
    await expect(this.text('Athlete Score')).toBeVisible();
  }

  /** Fresh user, signed up and fully onboarded, landing on the dashboard. */
  async onboardedUser(user: TestUser = makeUser(), profile: TestProfile = DEFAULT_PROFILE) {
    await this.signUp(user);
    await this.completeOnboarding(profile);
    await this.expectDashboard();
    return user;
  }

  async signOut() {
    await this.tab('Profil').click();
    await this.button('Çıkış yap').click();
    await expect(this.button('Hemen başla')).toBeVisible();
  }
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

type Fixtures = { app: App; consoleErrors: string[] };

export const test = base.extend<Fixtures>({
  /** Fails any test that logs a console error or throws an uncaught exception. */
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(`Uncaught: ${err.message}`));
      await use(errors);
      expect(errors, 'browser console errors').toEqual([]);
    },
    { auto: true },
  ],
  app: async ({ page }, use) => {
    await use(new App(page));
  },
});

export { expect };
