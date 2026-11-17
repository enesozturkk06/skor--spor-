/**
 * Cloudflare Pages build guard (scripts/pages-guard.mjs): the public test
 * site must be a backend-free demo. Each rule is checked in a throw-away
 * checkout, with a clean environment, the way Pages runs it (CF_PAGES=1).
 * No value given to the guard may ever appear in its output.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { expect, test } from '@playwright/test';

const ROOT = join(__dirname, '../..');
const GUARD = join(ROOT, 'scripts/pages-guard.mjs');

/** Process environment without anything the guard looks for (the dev machine may have some). */
function cleanEnv(extra: Record<string, string> = {}) {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || /^EXPO_PUBLIC_|SUPABASE|SERVICE_ROLE|DATABASE_URL|^POSTGRES|^PG.*PASSWORD|JWT_SECRET/i.test(k)) continue;
    env[k] = v;
  }
  return { ...env, CF_PAGES: '1', ...extra };
}

/** A minimal checkout: the real app.json and .env.example, plus optional files. */
function checkout(files: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pages-guard-'));
  copyFileSync(join(ROOT, 'app.json'), join(dir, 'app.json'));
  copyFileSync(join(ROOT, '.env.example'), join(dir, '.env.example'));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

function runGuard(dir: string, env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [GUARD, `--root=${dir}`], { env: cleanEnv(env), encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const SECRET_URL = 'https://abcdefghijklmnop.supabase.co';
const SECRET_KEY = 'sb_publishable_THIS_VALUE_MUST_NEVER_BE_PRINTED_123';
const SERVICE_KEY = 'sb_secret_THIS_VALUE_MUST_NEVER_BE_PRINTED_456';

test.describe('Cloudflare Pages build koruması', () => {
  test('temiz demo checkout: build devam eder', () => {
    const r = runGuard(checkout());
    expect(r.code).toBe(0);
    expect(r.out).toContain('[pages-guard] OK (Cloudflare Pages)');
  });

  test('Supabase URL / anahtarı tanımlıysa durur; değerler yazdırılmaz', () => {
    for (const [name, value] of [
      ['EXPO_PUBLIC_SUPABASE_URL', SECRET_URL],
      ['EXPO_PUBLIC_SUPABASE_ANON_KEY', SECRET_KEY],
      ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
      ['SUPABASE_DB_URL', 'postgresql://user:pass@db.example:5432/postgres'],
    ]) {
      const r = runGuard(checkout(), { [name]: value });
      expect(r.code, name).toBe(1);
      expect(r.out).toContain(name);
      expect(r.out, `${name} value leaked`).not.toContain(value);
    }
  });

  test('EXPO_PUBLIC_TRAINING_SYNC ve EXPO_PUBLIC_MOTION_LAB tanımlıysa (boş bile olsa) durur', () => {
    for (const name of ['EXPO_PUBLIC_TRAINING_SYNC', 'EXPO_PUBLIC_MOTION_LAB']) {
      for (const value of ['1', '0', '']) {
        const r = runGuard(checkout(), { [name]: value });
        expect(r.code, `${name}=${value}`).toBe(1);
        expect(r.out).toContain(name);
      }
    }
  });

  test('checkout içinde .env dosyası varsa durur; içeriği yazdırılmaz', () => {
    for (const file of ['.env', '.env.local', '.env.production', '.env.production.local', '.ENV']) {
      const r = runGuard(checkout({ [file]: `EXPO_PUBLIC_SUPABASE_URL=${SECRET_URL}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${SECRET_KEY}\n` }));
      expect(r.code, file).toBe(1);
      expect(r.out).toContain(file);
      expect(r.out).not.toContain(SECRET_URL);
      expect(r.out).not.toContain(SECRET_KEY);
    }
  });

  test('.env.example boş şablon olmalı; doldurulmuşsa durur', () => {
    const r = runGuard(checkout({ '.env.example': `# template\nEXPO_PUBLIC_SUPABASE_URL=${SECRET_URL}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=\n` }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('.env.example has a value for EXPO_PUBLIC_SUPABASE_URL');
    expect(r.out).not.toContain(SECRET_URL);
    // The real, tracked template passes.
    expect(readFileSync(join(ROOT, '.env.example'), 'utf8')).toMatch(/EXPO_PUBLIC_SUPABASE_URL=\s*$/m);
  });

  test('web çıktısı "single" dışına çıkarsa ya da dinamik app.config eklenirse durur', () => {
    const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
    expect(app.expo.web.output).toBe('single');
    for (const output of ['server', 'static']) {
      const r = runGuard(checkout({ 'app.json': JSON.stringify({ expo: { ...app.expo, web: { ...app.expo.web, output } } }) }));
      expect(r.code, output).toBe(1);
      expect(r.out).toContain(`"${output}", expected "single"`);
    }
    const dyn = runGuard(checkout({ 'app.config.ts': 'export default {}' }));
    expect(dyn.code).toBe(1);
  });

  test('bilinmeyen ya da yanlış yazılmış her EXPO_PUBLIC_ değişkeni durdurur (Expo hepsini pakete gömer)', () => {
    for (const name of ['EXPO_PUBLIC_SUPABASE_KEY', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_FOO']) {
      const r = runGuard(checkout(), { [name]: SECRET_URL });
      expect(r.code, name).toBe(1);
      expect(r.out).toContain(name);
      expect(r.out).not.toContain(SECRET_URL);
    }
  });

  test('veritabanı ve diğer kimlik bilgisi adları durdurur; değerler yazdırılmaz', () => {
    const db = 'postgresql://postgres:VERY_SECRET_PASSWORD@db.abc.supabase.co:5432/postgres';
    for (const name of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PASSWORD', 'PGPASSWORD', 'JWT_SECRET', 'SERVICE_ROLE_KEY']) {
      const r = runGuard(checkout(), { [name]: db });
      expect(r.code, name).toBe(1);
      expect(r.out).toContain(name);
      expect(r.out).not.toContain('VERY_SECRET_PASSWORD');
    }
    // Cloudflare's own build variables are fine.
    expect(runGuard(checkout(), { CF_PAGES_BRANCH: 'develop', CF_PAGES_COMMIT_SHA: 'abc', CF_PAGES_URL: 'https://x.pages.dev', NODE_VERSION: '24' }).code).toBe(0);
  });

  test('koda ya da app.json içine yazılmış Supabase adresi / anahtarı / JWT durdurur; yalnızca dosya adı yazılır', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlLXNpZ25hdHVyZQ';
    for (const [file, content, secret] of [
      ['src/lib/config.ts', `export const URL = '${SECRET_URL}';`, SECRET_URL],
      ['src/features/x/keys.tsx', `const k = '${SECRET_KEY}';`, SECRET_KEY],
      ['src/lib/admin.ts', `const s = '${SERVICE_KEY}';`, SERVICE_KEY],
      ['src/lib/jwt.ts', `const t = '${jwt}';`, jwt],
    ]) {
      const r = runGuard(checkout({ [file]: content }));
      expect(r.code, file).toBe(1);
      expect(r.out).toContain(file);
      expect(r.out, `${file} value leaked`).not.toContain(secret);
    }
    const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
    const extra = runGuard(checkout({ 'app.json': JSON.stringify({ expo: { ...app.expo, extra: { supabaseUrl: SECRET_URL } } }) }));
    expect(extra.code).toBe(1);
    expect(extra.out).toContain('app.json contains');
    expect(extra.out).not.toContain(SECRET_URL);
  });

  test('ortam değerlerini pakete gömebilen babel / metro yapılandırması eklenirse durur', () => {
    for (const file of ['babel.config.js', 'metro.config.js', 'app.config.js']) {
      const r = runGuard(checkout({ [file]: 'module.exports = {};' }));
      expect(r.code, file).toBe(1);
      expect(r.out).toContain(file);
    }
  });

  test('birden fazla sorun aynı anda raporlanır', () => {
    const r = runGuard(checkout({ '.env': 'X=1\n' }), { EXPO_PUBLIC_SUPABASE_URL: SECRET_URL, EXPO_PUBLIC_MOTION_LAB: '1' });
    expect(r.code).toBe(1);
    expect(r.out.match(/✗/g)).toHaveLength(3);
  });
});
