import { test as base, expect } from '@playwright/test';

import { App } from '../fixtures';

import { MockSupabase } from './mock-supabase';

type Fixtures = { mock: MockSupabase; app: App; guards: void };

/** Expected browser noise when the mock answers 4xx/5xx or aborts on purpose. */
const EXPECTED_NETWORK_NOISE = [/Failed to load resource: the server responded with a status of [45]\d\d/, /net::ERR_FAILED/];

export const test = base.extend<Fixtures>({
  mock: async ({ page }, use) => {
    const mock = new MockSupabase(page);
    await mock.install();
    await use(mock);
  },

  app: async ({ page, mock }, use) => {
    void mock; // the mock must be routed before the app's first request
    await use(new App(page));
  },

  /** Fails the test on real Supabase traffic, uncaught errors or unexpected console errors. */
  guards: [
    async ({ page }, use) => {
      const realBackendHits: string[] = [];
      await page.route(/^https:\/\/[^/]*supabase\.(co|com|in)\//, (route) => {
        realBackendHits.push(route.request().url());
        return route.abort('blockedbyclient');
      });
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !EXPECTED_NETWORK_NOISE.some((re) => re.test(msg.text()))) errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(`Uncaught: ${err.message}`));
      await use();
      expect(realBackendHits, 'requests to a real Supabase host').toEqual([]);
      expect(errors, 'browser console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const PASSWORD = 'guclu1234';
export const uniqueEmail = () => `athlete${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
