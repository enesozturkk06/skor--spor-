#!/usr/bin/env node
/**
 * Builds the two web bundles the E2E suite needs. Neither ever reads .env,
 * so tests can never reach the real Supabase project.
 *
 *   dist/       demo mode (no backend)
 *   dist-mock/  Supabase mode pointed at https://skor-e2e.invalid — a reserved
 *               TLD that never resolves; the suite intercepts it in the browser.
 */
import { spawnSync } from 'node:child_process';

export const MOCK_SUPABASE_URL = 'https://skor-e2e.invalid';
const MOCK_KEY = 'sb_publishable_e2e_mock_key_not_a_real_key';

const builds = [
  { out: 'dist', env: { EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '', EXPO_PUBLIC_MOTION_LAB: '1' } },
  { out: 'dist-mock', env: { EXPO_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY: MOCK_KEY, EXPO_PUBLIC_MOTION_LAB: '1' } },
];

for (const { out, env } of builds) {
  console.log(`[e2e-build] ${out} (${env.EXPO_PUBLIC_SUPABASE_URL || 'demo'})`);
  // Sequential on purpose: parallel Metro exports in one project share caches.
  const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, EXPO_NO_DOTENV: '1', ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
