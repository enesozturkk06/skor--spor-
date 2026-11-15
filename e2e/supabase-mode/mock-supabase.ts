/**
 * In-browser stand-in for the Supabase Auth + REST APIs, used by the
 * Supabase-mode E2E tests. The app under test is built against
 * https://skor-e2e.invalid (a reserved TLD that never resolves), and every
 * request to it is answered here — the real project is never contacted.
 *
 * Response shapes follow what @supabase/supabase-js 2.119 parses
 * (auth-js fetch.ts / postgrest-js), and RLS is emulated: a token only
 * reads and writes its own athlete_profiles row.
 */
import { randomUUID } from 'node:crypto';

import type { Page, Request, Route } from '@playwright/test';

export const MOCK_URL = 'https://skor-e2e.invalid';

const SPORTS = ['fitness', 'bodybuilding', 'boxing', 'kickboxing', 'karate', 'football', 'basketball', 'volleyball', 'running', 'swimming', 'tennis'];
const GOALS = ['muscle_gain', 'fat_loss', 'strength', 'endurance', 'performance', 'competition', 'mobility', 'wellness'];

export type MockUser = { id: string; email: string; password: string; name: string; confirmed: boolean; createdAt: string };

export type ProfileRow = {
  user_id: string;
  primary_sport: string;
  secondary_sports: string[];
  goals: string[];
  age: number;
  height_cm: number;
  weight_kg: number;
  created_at: string;
  updated_at: string;
};

export type RecordedRequest = { method: string; path: string; query: Record<string, string>; body: unknown; auth: string | null };

type Failure = 'none' | 'network' | 'server' | 'unauthorized';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

export class MockSupabase {
  readonly users = new Map<string, MockUser>(); // by lower-case email
  readonly profiles = new Map<string, ProfileRow>(); // by user_id
  readonly requests: RecordedRequest[] = [];
  private readonly accessTokens = new Map<string, string>(); // token → user id
  private readonly refreshTokens = new Map<string, string>();
  profileReads: Failure = 'none';
  profileWrites: Failure = 'none';
  /** Artificial latency for profile reads (to observe loading states). */
  profileReadDelayMs = 0;

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.route(`${MOCK_URL}/**`, (route) => this.handle(route));
  }

  /* --------------------------- test helpers --------------------------- */

  addUser(u: { email: string; password: string; name?: string; confirmed?: boolean }): MockUser {
    const user: MockUser = {
      id: randomUUID(),
      email: u.email.toLowerCase(),
      password: u.password,
      name: u.name ?? 'Deniz Kaya',
      confirmed: u.confirmed ?? true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.email, user);
    return user;
  }

  addProfile(userId: string, over: Partial<ProfileRow> = {}): ProfileRow {
    const now = new Date(Date.now() - 86_400_000).toISOString();
    const row: ProfileRow = {
      user_id: userId,
      primary_sport: 'boxing',
      secondary_sports: ['fitness'],
      goals: ['strength'],
      age: 27,
      height_cm: 178,
      weight_kg: 75,
      created_at: now,
      updated_at: now,
      ...over,
    };
    this.profiles.set(userId, row);
    return row;
  }

  /** Confirms the account and returns the link the confirmation email would contain. */
  confirmationLink(email: string, appOrigin: string): string {
    const user = this.users.get(email.toLowerCase());
    if (!user) throw new Error(`no mock user ${email}`);
    user.confirmed = true;
    const s = this.issueSession(user);
    return `${appOrigin}/auth/callback#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=3600&refresh_token=${s.refresh_token}&token_type=bearer&type=signup`;
  }

  /** Server-side revocation (e.g. password changed elsewhere, admin sign-out). */
  revokeAllSessions() {
    this.accessTokens.clear();
    this.refreshTokens.clear();
  }

  calls(method: string, path: string) {
    return this.requests.filter((r) => r.method === method && r.path === path);
  }

  /* ----------------------------- internals ---------------------------- */

  private userJson(u: MockUser) {
    return {
      id: u.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: u.email,
      email_confirmed_at: u.confirmed ? u.createdAt : null,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: u.name },
      identities: [{ id: u.id, user_id: u.id, provider: 'email', identity_data: { email: u.email, sub: u.id } }],
      created_at: u.createdAt,
      updated_at: u.createdAt,
    };
  }

  private issueSession(u: MockUser) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const access_token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', iat, exp, session_id: randomUUID() })}.mock-signature`;
    const refresh_token = randomUUID();
    this.accessTokens.set(access_token, u.id);
    this.refreshTokens.set(refresh_token, u.id);
    return { access_token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token, user: this.userJson(u) };
  }

  private userById(id: string) {
    for (const u of this.users.values()) if (u.id === id) return u;
    return null;
  }

  private bearerUser(req: Request): MockUser | null {
    const auth = req.headers()['authorization'] ?? '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const id = this.accessTokens.get(token);
    return id ? this.userById(id) : null;
  }

  private cors(req: Request) {
    return {
      'access-control-allow-origin': req.headers()['origin'] ?? '*',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*',
      'access-control-expose-headers': 'content-range, x-supabase-api-version',
    };
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({ status, headers: { ...this.cors(route.request()), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }

  private authError(route: Route, status: number, error_code: string, msg: string) {
    return this.json(route, status, { code: status, error_code, msg });
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: this.cors(req) });

    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    this.requests.push({
      method: req.method(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      auth: req.headers()['authorization'] ?? null,
    });

    if (url.pathname.startsWith('/auth/v1/')) return this.handleAuth(route, url, body as Record<string, unknown>);
    if (url.pathname === '/rest/v1/athlete_profiles') return this.handleProfiles(route, url, body);
    return this.json(route, 404, { message: `mock: unhandled ${req.method()} ${url.pathname}` });
  }

  private handleAuth(route: Route, url: URL, body: Record<string, unknown>) {
    const req = route.request();
    const path = url.pathname.replace('/auth/v1', '');

    if (path === '/signup' && req.method() === 'POST') {
      const email = String(body.email ?? '').toLowerCase();
      const existing = this.users.get(email);
      // Like Supabase with confirmation on: an existing address gets the same
      // answer (user, no session) so accounts can't be enumerated.
      if (existing) return this.json(route, 200, { ...this.userJson(existing), identities: [] });
      const meta = (body.data ?? {}) as { display_name?: string };
      const user = this.addUser({ email, password: String(body.password ?? ''), name: meta.display_name, confirmed: false });
      return this.json(route, 200, this.userJson(user));
    }

    if (path === '/token' && req.method() === 'POST') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const user = this.users.get(String(body.email ?? '').toLowerCase());
        if (!user || user.password !== body.password) return this.authError(route, 400, 'invalid_credentials', 'Invalid login credentials');
        if (!user.confirmed) return this.authError(route, 400, 'email_not_confirmed', 'Email not confirmed');
        return this.json(route, 200, this.issueSession(user));
      }
      if (grant === 'refresh_token') {
        const id = this.refreshTokens.get(String(body.refresh_token ?? ''));
        const user = id ? this.userById(id) : null;
        if (!user) return this.authError(route, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        this.refreshTokens.delete(String(body.refresh_token));
        return this.json(route, 200, this.issueSession(user));
      }
    }

    if (path === '/user' && req.method() === 'GET') {
      const user = this.bearerUser(req);
      if (!user) return this.authError(route, 403, 'session_not_found', 'Session from session_id claim in JWT does not exist');
      return this.json(route, 200, this.userJson(user));
    }

    if (path === '/logout' && req.method() === 'POST') {
      const token = (req.headers()['authorization'] ?? '').replace(/^Bearer\s+/i, '');
      this.accessTokens.delete(token);
      return route.fulfill({ status: 204, headers: this.cors(req) });
    }

    if (path === '/resend' && req.method() === 'POST') return this.json(route, 200, {});

    return this.json(route, 404, { msg: `mock: unhandled auth ${req.method()} ${path}` });
  }

  private profileViolation(b: Partial<ProfileRow>): string | null {
    if (!SPORTS.includes(String(b.primary_sport))) return 'athlete_profiles_primary_sport_valid';
    const sec = b.secondary_sports ?? [];
    if (sec.length > 4 || sec.some((s) => !SPORTS.includes(s)) || sec.includes(String(b.primary_sport))) return 'athlete_profiles_secondary_sports_valid';
    const goals = b.goals ?? [];
    if (goals.length > 3 || goals.some((g) => !GOALS.includes(g))) return 'athlete_profiles_goals_valid';
    if (!(Number(b.age) >= 13 && Number(b.age) <= 90)) return 'athlete_profiles_age_range';
    if (!(Number(b.height_cm) >= 120 && Number(b.height_cm) <= 230)) return 'athlete_profiles_height_range';
    if (!(Number(b.weight_kg) >= 30 && Number(b.weight_kg) <= 250)) return 'athlete_profiles_weight_range';
    return null;
  }

  private async handleProfiles(route: Route, url: URL, body: unknown) {
    const req = route.request();
    const user = this.bearerUser(req);
    const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object+json');
    // Mirrors the live grants: anon has no privileges at all.
    if (!user) return this.json(route, 401, { code: '42501', details: null, hint: null, message: 'permission denied for table athlete_profiles' });

    if (req.method() === 'GET') {
      if (this.profileReadDelayMs) await new Promise((r) => setTimeout(r, this.profileReadDelayMs));
      if (this.profileReads === 'network') return route.abort('failed');
      if (this.profileReads === 'server') return this.json(route, 503, { code: 'PGRST000', message: 'mock: service unavailable' });
      if (this.profileReads === 'unauthorized') return this.json(route, 401, { code: 'PGRST301', message: 'JWT expired' });
      const filter = url.searchParams.get('user_id') ?? '';
      const wanted = filter.startsWith('eq.') ? filter.slice(3) : null;
      // RLS: only the caller's own row is ever visible.
      const rows = [...this.profiles.values()].filter((r) => r.user_id === user.id && (!wanted || r.user_id === wanted));
      if (wantsObject) return rows.length === 1 ? this.json(route, 200, rows[0]) : this.json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      return this.json(route, 200, rows);
    }

    if (req.method() === 'POST') {
      if (this.profileWrites === 'network') return route.abort('failed');
      if (this.profileWrites === 'server') return this.json(route, 500, { code: 'XX000', message: 'mock: internal error' });
      const b = (Array.isArray(body) ? body[0] : body) as Partial<ProfileRow>;
      if (b.user_id !== user.id) {
        return this.json(route, 403, { code: '42501', message: 'new row violates row-level security policy for table "athlete_profiles"' });
      }
      const violation = this.profileViolation(b);
      if (violation) return this.json(route, 400, { code: '23514', message: `new row violates check constraint "${violation}"` });
      // Trigger semantics: server-managed timestamps, client values ignored.
      const now = new Date().toISOString();
      const prev = this.profiles.get(user.id);
      const row: ProfileRow = {
        user_id: user.id,
        primary_sport: String(b.primary_sport),
        secondary_sports: b.secondary_sports ?? [],
        goals: b.goals ?? [],
        age: Number(b.age),
        height_cm: Number(b.height_cm),
        weight_kg: Number(b.weight_kg),
        created_at: prev?.created_at ?? now,
        updated_at: now,
      };
      this.profiles.set(user.id, row);
      return this.json(route, prev ? 200 : 201, wantsObject ? row : [row]);
    }

    return this.json(route, 405, { message: 'mock: method not allowed' });
  }
}
