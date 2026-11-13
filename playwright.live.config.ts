import { defineConfig } from '@playwright/test';

/**
 * LIVE Supabase security checks — opt-in only: `npm run test:live`.
 *
 * Runs against the real project from .env using the publishable key alone.
 * Read-only by design: no users are created and no rows can be written
 * (writes target a random id that matches nothing, and must be refused).
 * Never part of `npm test`, which runs fully offline in demo mode.
 */
try {
  process.loadEnvFile('.env');
} catch {
  // Missing .env → the spec fails with a clear message.
}

export default defineConfig({
  testDir: './e2e/live',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
});
