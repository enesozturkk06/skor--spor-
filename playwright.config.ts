import { defineConfig, devices } from '@playwright/test';

/**
 * SKOR SPOR end-to-end tests.
 *
 * Tests run against production web builds (`expo export` + scripts/serve-web.mjs),
 * so they exercise what real users get rather than the dev server.
 * Every test gets a fresh browser context = empty storage = isolated user.
 *
 * Two builds, both made by scripts/e2e-build.mjs and NEITHER reading .env:
 *   - demo build          → projects "mobile" and "desktop"
 *   - Supabase-mock build → project "supabase-mock"; its backend URL is a
 *     never-resolving .invalid host answered by e2e/supabase-mode/mock-supabase.ts
 * The real Supabase project is only ever touched by `npm run test:live`.
 */
const DEMO_PORT = Number(process.env.E2E_PORT ?? 8123);
const MOCK_PORT = DEMO_PORT + 2;
const isCI = Boolean(process.env.CI);

const notHere = ['**/live/**', '**/supabase-mode/**'];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', testIgnore: notHere, use: { ...devices['Pixel 7'], baseURL: `http://localhost:${DEMO_PORT}` } },
    {
      name: 'desktop',
      // Full flows run on mobile; desktop checks responsive layout only.
      testMatch: /layout\.spec\.ts/,
      testIgnore: notHere,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${DEMO_PORT}` },
    },
    {
      name: 'supabase-mock',
      testDir: './e2e/supabase-mode',
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${MOCK_PORT}` },
    },
  ],
  webServer: {
    // Builds dist/ (demo) and dist-mock/ (Supabase → mock), then serves both with SPA fallback.
    command: `node scripts/e2e-build.mjs && node scripts/serve-web.mjs ${DEMO_PORT}:dist ${MOCK_PORT}:dist-mock`,
    url: `http://localhost:${MOCK_PORT}`,
    reuseExistingServer: !isCI,
    timeout: 420_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
