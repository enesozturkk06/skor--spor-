/**
 * The E2E builds must never contain the real Supabase project. Runs after the
 * web server has built dist/ (demo) and dist-mock/ (Supabase → mock host).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const ROOT = join(__dirname, '../..');

function bundleText(dir: string): string {
  const js = join(ROOT, dir, '_expo/static/js/web');
  return readdirSync(js)
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(js, f), 'utf8'))
    .join('\n');
}

/** The real project URL, read from .env only to assert it is absent. */
function realSupabaseUrl(): string | null {
  const envFile = join(ROOT, '.env');
  if (!existsSync(envFile)) return null;
  const m = /^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m.exec(readFileSync(envFile, 'utf8'));
  return m?.[1].trim() || null;
}

test.describe('E2E build ayrımı', () => {
  test('demo build arka uç adresi içermez', () => {
    const demo = bundleText('dist');
    expect(demo).not.toContain('skor-e2e.invalid');
    const real = realSupabaseUrl();
    if (real) expect(demo.includes(real), 'real Supabase URL in demo build').toBe(false);
  });

  test('gerçek proje yapılandırması antrenman senkronizasyonunu açmaz (tablolar canlıda yok — Phase 3F)', () => {
    // Until the training migration is applied with approval, a real build must
    // never query or write workouts. Remove this guard in Phase 3F.
    const envFile = join(ROOT, '.env');
    const value = existsSync(envFile) ? /^EXPO_PUBLIC_TRAINING_SYNC=(.*)$/m.exec(readFileSync(envFile, 'utf8'))?.[1].trim() : undefined;
    expect(value ?? '').not.toBe('1');
  });

  test('mock build yalnızca .invalid sahte adresi kullanır', () => {
    const mock = bundleText('dist-mock');
    expect(mock).toContain('https://skor-e2e.invalid');
    const real = realSupabaseUrl();
    if (real) expect(mock.includes(real), 'real Supabase URL in mock build').toBe(false);
    expect(mock).not.toMatch(/sb_secret_[A-Za-z0-9]/);
  });
});
