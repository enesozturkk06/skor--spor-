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
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
