/**
 * What Cloudflare Pages will serve: the web export must stay a single-page app
 * with our headers file, and carry no real backend. Checks the demo build the
 * suite makes (dist/), which uses the same `expo export -p web` as Pages.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

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
    // Our template (public/index.html) must not survive as-is: Expo writes the real one over it.
    expect(readFileSync(join(DIST, 'index.html'), 'utf8')).not.toContain('%WEB_TITLE%');
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

  test('ilk ekran JavaScript beklemeden HTML içinde: koyu zemin, logo ve slogan', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toContain('id="skor-shell"');
    expect(html).toContain('OWN YOUR<br /><span>PERFORMANCE.</span>');
    expect(html).toMatch(/html,\s*body\s*\{[^}]*background:\s*#080d0d/);
    expect(html).toContain('prefers-reduced-motion: reduce');
    // Expo still injects the app scripts into our template.
    expect(html).toMatch(/<script src="\/_expo\/static\/js\/web\/entry-[0-9a-f]{32}\.js" defer><\/script>/);
  });

  test('fontlar WOFF2: önceden yüklenenler ve tüm @font-face dosyaları derlemede var, kalıcı önbellekli', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    const preloads = [...html.matchAll(/<link rel="preload" href="(\/fonts\/[^"]+\.woff2)" as="font" type="font\/woff2" crossorigin \/>/g)].map((m) => m[1]);
    expect(preloads.length).toBeGreaterThanOrEqual(2);
    const faces = [...html.matchAll(/url\((\/fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
    expect(faces).toHaveLength(9);
    for (const f of new Set([...preloads, ...faces])) {
      const file = join(DIST, f);
      expect(existsSync(file), f).toBe(true);
      expect(readFileSync(file).subarray(0, 4).toString('latin1'), `${f} is WOFF2`).toBe('wOF2');
    }
    expect(readFileSync(join(DIST, '_headers'), 'utf8')).toMatch(/\/fonts\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
  });

  test('demo derlemesinde Supabase SDK ilk yüklenen JavaScript içinde değil; yalnızca ayrı bir parçada', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    const initial = [...html.matchAll(/<script src="([^"]+\.js)"/g)].map((m) => m[1]);
    expect(initial.length).toBeGreaterThan(0);
    // GoTrueClient: Supabase Auth's client class — present iff the SDK is bundled in that file.
    for (const src of initial) expect(readFileSync(join(DIST, src), 'utf8').includes('GoTrueClient'), `${src} contains the Supabase SDK`).toBe(false);
    const lazy = files(join(DIST, '_expo/static/js/web')).filter((f) => readFileSync(f, 'utf8').includes('GoTrueClient'));
    expect(lazy.map((f) => relative(DIST, f).replace(/\\/g, '/')), 'the SDK lives in exactly one lazy chunk').toHaveLength(1);
  });

  test('performans bütçesi: ilk yüklenen JavaScript, Aşama 1 sonucundan en fazla +15 KB (gzip) büyük', () => {
    // Phase 1 result (2026-11-17, demo build): 605,084 bytes gzip -9 across the
    // three initial scripts. The budget is a product decision — change it only
    // with approval, never to make this test pass.
    const PHASE1_GZIP = 605_084;
    const BUDGET = 15 * 1024;
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    const initial = [...html.matchAll(/<script src="([^"]+\.js)"/g)].map((m) => m[1]);
    const gz = initial.reduce((n, src) => n + gzipSync(readFileSync(join(DIST, src)), { level: 9 }).length, 0);
    expect(gz, `initial JS is ${gz} bytes gzip; budget ${PHASE1_GZIP + BUDGET}`).toBeLessThanOrEqual(PHASE1_GZIP + BUDGET);
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
