/**
 * What Cloudflare Pages will serve: the web export must stay a single-page app
 * with our headers file, and carry no real backend. Checks the demo build the
 * suite makes (dist/), which uses the same `expo export -p web` as Pages.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { expect, test } from '@playwright/test';

const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test.describe('Cloudflare Pages çıktısı', () => {
  test('tek sayfalık uygulama: index.html var, hiçbir 404.html yok (Pages SPA yönlendirmesi)', () => {
    const all = files(DIST).map((f) => relative(DIST, f).replace(/\\/g, '/'));
    expect(all).toContain('index.html');
    expect(all.filter((f) => /(^|\/)404\.html$/.test(f)), 'a 404.html would turn off SPA fallback').toEqual([]);
    expect(all.filter((f) => f.endsWith('.html')), 'single output: one HTML file').toEqual(['index.html']);
    expect(existsSync(join(DIST, '_redirects')), 'no _redirects: Pages SPA mode does it').toBe(false);
  });

  test('_headers dist içine birebir kopyalanır; güvenlik başlıkları ve önbellek kuralları içerir', () => {
    const copied = join(DIST, '_headers');
    expect(existsSync(copied)).toBe(true);
    const content = readFileSync(copied, 'utf8');
    expect(content).toBe(readFileSync(join(ROOT, 'public/_headers'), 'utf8'));
    for (const h of ['X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy: strict-origin-when-cross-origin', 'X-Robots-Tag: noindex']) {
      expect(content).toContain(h);
    }
    expect(content).toMatch(/\/_expo\/static\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
    // Expo bundles are content-hashed, so "immutable" is safe for them.
    const bundles = files(join(DIST, '_expo/static/js/web')).filter((f) => f.endsWith('.js'));
    expect(bundles.length).toBeGreaterThan(0);
    for (const b of bundles) expect(b).toMatch(/-[0-9a-f]{32}\.js$/);
  });

  test('Cloudflare sınırları: dosya sayısı ve boyutu ücretsiz planın çok altında', () => {
    const all = files(DIST);
    expect(all.length).toBeLessThan(20_000);
    for (const f of all) expect(statSync(f).size, relative(DIST, f)).toBeLessThan(25 * 1024 * 1024);
  });

  test('gerçek Supabase adresi ve anahtarı derlemede yok', () => {
    const envFile = join(ROOT, '.env');
    const env = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
    const real = [/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m, /^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m]
      .map((re) => re.exec(env)?.[1].trim())
      .filter((v): v is string => Boolean(v));
    const text = files(DIST)
      .filter((f) => /\.(js|html|json)$/.test(f))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const value of real) expect(text.includes(value), 'real Supabase value in the web build').toBe(false);
    expect(text).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.(co|in)/);
  });
});
