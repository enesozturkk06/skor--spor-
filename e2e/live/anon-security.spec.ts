/**
 * Live security checks for the signed-out (anon) role, using only the
 * publishable key. Creates no users and writes nothing.
 *
 * Before the migration is applied the table checks are skipped (not passed),
 * so the report always shows what was really verified.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
/** Matches no row: even a broken policy could not change real data. */
const NOBODY = randomUUID();

const headers = { apikey: KEY, Accept: 'application/json', 'Content-Type': 'application/json' };
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });

async function json(res: Response): Promise<{ code?: string; message?: string } & Record<string, unknown>> {
  try {
    return (await res.json()) as never;
  } catch {
    return {};
  }
}

/** PostgREST's answer when a role lacks privileges (anon has none on this table). */
async function expectPermissionDenied(res: Response, what: string) {
  const body = await json(res);
  expect([401, 403], `${what}: HTTP ${res.status} ${JSON.stringify(body)}`).toContain(res.status);
  expect(body.code, `${what}: ${JSON.stringify(body)}`).toBe('42501');
}

let tableExists = false;

test.beforeAll(async () => {
  if (!URL.startsWith('https://') || !KEY) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  }
  // Hard stop: these checks must only ever run with the public client key.
  if (!KEY.startsWith('sb_publishable_') || /sb_secret_|service_role/.test(KEY)) {
    throw new Error('Refusing to run: EXPO_PUBLIC_SUPABASE_ANON_KEY is not a publishable key');
  }
  const res = await rest('athlete_profiles?select=user_id&limit=1');
  const body = await json(res);
  tableExists = !(res.status === 404 && body.code === 'PGRST205');
});

test.describe('Canlı proje yapılandırması', () => {
  test('.env yalnızca publishable key içerir, secret key içermez', () => {
    const env = readFileSync('.env', 'utf8');
    expect(KEY.startsWith('sb_publishable_')).toBe(true);
    expect(env).not.toMatch(/sb_secret_|service_role/);
  });

  test('anonim oturum açma kapalı (aksi halde herkes "authenticated" rolü alır)', async () => {
    const res = await fetch(`${URL}/auth/v1/settings`, { headers });
    expect(res.status).toBe(200);
    const settings = (await res.json()) as { external?: { anonymous_users?: boolean } };
    expect(settings.external?.anonymous_users ?? false).toBe(false);
  });

  test('e-posta doğrulaması durumu raporlanır', async () => {
    const res = await fetch(`${URL}/auth/v1/settings`, { headers });
    const settings = (await res.json()) as { mailer_autoconfirm?: boolean };
    // A product decision, not a hard rule: reported instead of asserted.
    test.info().annotations.push({
      type: settings.mailer_autoconfirm ? 'warning' : 'info',
      description: settings.mailer_autoconfirm ? 'E-posta doğrulaması KAPALI' : 'E-posta doğrulaması zorunlu',
    });
  });

  test('API yalnızca beklenen tabloları açığa çıkarır', async () => {
    const res = await rest('');
    if (res.status !== 200) return; // schema listing hidden from anon → nothing exposed
    const spec = (await res.json()) as { paths?: Record<string, unknown> };
    const tables = Object.keys(spec.paths ?? {}).filter((p) => p !== '/' && !p.startsWith('/rpc/'));
    expect(tables.every((t) => t === '/athlete_profiles'), `exposed: ${tables.join(', ')}`).toBe(true);
  });
});

test.describe('athlete_profiles: oturumsuz (anon) erişim engelli', () => {
  test.beforeEach(() => {
    test.skip(!tableExists, 'Migration henüz canlıya uygulanmadı (tablo yok)');
  });

  test('okuma reddedilir', async () => {
    await expectPermissionDenied(await rest('athlete_profiles?select=*'), 'select');
  });

  test('ekleme reddedilir', async () => {
    const res = await rest('athlete_profiles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: NOBODY, primary_sport: 'boxing', age: 30, height_cm: 180, weight_kg: 80 }),
    });
    expect(res.status, 'insert must never succeed').not.toBe(201);
    await expectPermissionDenied(res, 'insert');
  });

  test('güncelleme reddedilir', async () => {
    const res = await rest(`athlete_profiles?user_id=eq.${NOBODY}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ age: 40 }),
    });
    await expectPermissionDenied(res, 'update');
  });

  test('silme reddedilir', async () => {
    const res = await rest(`athlete_profiles?user_id=eq.${NOBODY}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    await expectPermissionDenied(res, 'delete');
  });

  test('trigger fonksiyonu API üzerinden çağrılamaz', async () => {
    const res = await rest('rpc/athlete_profiles_set_timestamps', { method: 'POST', body: '{}' });
    expect(res.ok, `HTTP ${res.status}`).toBe(false);
  });
});
