import { defineConfig, devices } from '@playwright/test';

/**
 * SKOR SPOR end-to-end tests.
 *
 * Tests run against the production web build (`expo export` + scripts/serve-web.mjs),
 * so they exercise what real users get rather than the dev server.
 * Every test gets a fresh browser context = empty storage = isolated user.
 */
const PORT = Number(process.env.E2E_PORT ?? 8123);
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  // Live Supabase checks run only via `npm run test:live` (playwright.live.config.ts).
  testIgnore: ['**/live/**'],
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      // Full flows run on mobile; desktop checks responsive layout only.
      testMatch: /layout\.spec\.ts/,
    },
  ],
  webServer: {
    // serve-web.mjs adds the SPA fallback that `expo serve` lacks (refresh on /welcome etc.).
    command: `npm run build:web && node scripts/serve-web.mjs ${PORT}`,
    // Never build the test app against the real Supabase project from .env:
    // tests create accounts and must stay in local demo mode.
    // (auth.spec "Demo modu" assertion fails if this ever leaks.)
    env: { EXPO_NO_DOTENV: '1', EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '' },
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
