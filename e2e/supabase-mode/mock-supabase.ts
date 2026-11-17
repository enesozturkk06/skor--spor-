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
/** lost-response: the server stores the workout, then the connection drops before the answer arrives. */
export type WriteFailure = Failure | 'lost-response' | 'invalid';

export type SetRow = {
  exercise_key: string;
  exercise_name: string;
  position: number;
  set_index: number;
  kind: string;
  reps: number | null;
  weight_kg: number | null;
  duration_s: number | null;
  distance_m: number | null;
  rest_s: number | null;
  rpe: number | null;
  completed_at: string | null;
};
export type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  sport: string;
  goal: string | null;
  notes: string | null;
  days: number[];
  blocks: unknown[];
  created_at: string;
  updated_at: string;
};

export type WorkoutRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  sport: string;
  started_at: string;
  ended_at: string;
  rpe: number | null;
  notes: string | null;
  created_at: string;
  workout_sets: SetRow[];
};

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

export class MockSupabase {
  readonly users = new Map<string, MockUser>(); // by lower-case email
  readonly profiles = new Map<string, ProfileRow>(); // by user_id
  readonly workouts = new Map<string, WorkoutRow>(); // by id
  readonly templates = new Map<string, TemplateRow>(); // by id
  readonly requests: RecordedRequest[] = [];
  private readonly accessTokens = new Map<string, string>(); // token → user id
  private readonly refreshTokens = new Map<string, string>();
  profileReads: Failure = 'none';
  profileWrites: Failure = 'none';
  trainingReads: Failure = 'none';
  trainingWrites: WriteFailure = 'none';
  /** History pages after the first (requests carrying a cursor). */
  pageRequests = 0;
  /** Fail every request for an older page (the first page still works). */
  failOlderPages = false;
  templateReads: Failure = 'none';
  templateWrites: Failure = 'none';
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

  templatesOf(userId: string) {
    return [...this.templates.values()].filter((t) => t.user_id === userId);
  }

  /** Adds `count` finished workouts for a user directly on the server (oldest first). */
  seedWorkouts(userId: string, count: number, o: { startMs?: number; stepMs?: number; benchKg?: (i: number) => number; sameStart?: boolean } = {}) {
    const ids: string[] = [];
    const start = o.startMs ?? Date.now() - count * 86_400_000;
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      const t = o.sameStart ? start : start + i * (o.stepMs ?? 86_400_000);
      const started = new Date(t).toISOString();
      const ended = new Date(t + 45 * 60_000).toISOString();
      const kg = o.benchKg ? o.benchKg(i) : 60;
      this.workouts.set(id, {
        id, user_id: userId, template_id: null, name: `Seans ${i + 1}`, sport: 'fitness', started_at: started, ended_at: ended, rpe: null, notes: null, created_at: ended,
        workout_sets: [{ exercise_key: 'bench_press', exercise_name: 'Düz Bench Press', position: 1, set_index: 1, kind: 'normal', reps: 5, weight_kg: kg, duration_s: null, distance_m: null, rest_s: null, rpe: null, completed_at: ended }],
      });
      ids.push(id);
    }
    return ids;
  }

  workoutsOf(userId: string) {
    return [...this.workouts.values()].filter((w) => w.user_id === userId);
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
    if (url.pathname === '/rest/v1/rpc/save_workout') return this.handleSaveWorkout(route, body);
    if (url.pathname === '/rest/v1/workouts') return this.handleWorkouts(route, url);
    if (url.pathname === '/rest/v1/workout_templates') return this.handleTemplates(route, url, body);
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

  /* ------------------------------ training ----------------------------- */

  /**
   * Same rules as the save_workout() draft (scratchpad training migration):
   * the user comes from the session, never the payload; an id the caller
   * already owns is a no-op (idempotent retry); someone else's id is refused.
   */
  private workoutViolation(p: Record<string, unknown>, sets: Record<string, unknown>[]): { code: string; message: string } | null {
    if (sets.length < 1 || sets.length > 300) return { code: '22023', message: 'a workout needs 1-300 sets' };
    const started = Date.parse(String(p.started_at));
    const ended = Date.parse(String(p.ended_at));
    if (!(started <= Date.now() + 5 * 60_000)) return { code: '22023', message: 'workout cannot start in the future' };
    const name = String(p.name ?? '');
    if (!SPORTS.includes(String(p.sport)) || name.length < 1 || name.length > 80 || !(ended >= started) || ended - started > 12 * 3600_000) {
      return { code: '23514', message: 'new row for relation "workouts" violates check constraint "workouts_valid"' };
    }
    const keys = new Set<string>();
    for (const s of sets) {
      const n = (v: unknown, max: number) => v === null || v === undefined || (typeof v === 'number' && v >= 0 && v <= max);
      const ok =
        /^[a-z0-9_]{2,64}$/.test(String(s.exercise_key)) &&
        String(s.exercise_name ?? '').length >= 1 &&
        Number(s.position) >= 1 && Number(s.position) <= 60 &&
        Number(s.set_index) >= 1 && Number(s.set_index) <= 50 &&
        ['normal', 'warmup', 'drop', 'failure'].includes(String(s.kind ?? 'normal')) &&
        n(s.reps, 1000) && n(s.weight_kg, 1000) && n(s.duration_s, 43200) && n(s.distance_m, 1e6) && n(s.rest_s, 3600) &&
        (s.reps != null || s.duration_s != null || s.distance_m != null);
      if (!ok) return { code: '23514', message: 'new row for relation "workout_sets" violates check constraint "workout_sets_valid"' };
      const k = `${s.position}:${s.set_index}`;
      if (keys.has(k)) return { code: '23505', message: 'duplicate key value violates unique constraint' };
      keys.add(k);
    }
    return null;
  }

  private async handleSaveWorkout(route: Route, body: unknown) {
    const req = route.request();
    const user = this.bearerUser(req);
    if (!user) return this.json(route, 401, { code: '42501', message: 'permission denied for function save_workout' });
    if (this.trainingWrites === 'network') return route.abort('failed');
    if (this.trainingWrites === 'server') return this.json(route, 503, { code: 'PGRST000', message: 'mock: service unavailable' });
    if (this.trainingWrites === 'unauthorized') return this.json(route, 401, { code: 'PGRST301', message: 'JWT expired' });

    const p = ((body as { p?: Record<string, unknown> })?.p ?? {}) as Record<string, unknown>;
    const sets = Array.isArray(p.sets) ? (p.sets as Record<string, unknown>[]) : [];
    const id = String(p.id ?? '');
    const existing = this.workouts.get(id);
    if (existing) {
      if (existing.user_id !== user.id) return this.json(route, 403, { code: '42501', message: 'workout id conflict' });
      return this.json(route, 200, id); // retry of a saved workout: nothing to do
    }
    const tid = (p.template_id as string | null) ?? null;
    const tpl = tid ? this.templates.get(tid) : null;
    // FK (template_id, user_id) → workout_templates(id, user_id)
    const fk = tid && (!tpl || tpl.user_id !== user.id) ? { code: '23503', message: 'insert or update on table "workouts" violates foreign key constraint "workouts_template_owner_fk"' } : null;
    const violation = this.trainingWrites === 'invalid' ? { code: '23514', message: 'mock: refused' } : (fk ?? this.workoutViolation(p, sets));
    if (violation) return this.json(route, 400, { ...violation, details: null, hint: null });

    this.workouts.set(id, {
      id,
      user_id: user.id,
      template_id: (p.template_id as string) ?? null,
      name: String(p.name),
      sport: String(p.sport),
      started_at: String(p.started_at),
      ended_at: String(p.ended_at),
      rpe: (p.rpe as number) ?? null,
      notes: (p.notes as string) ?? null,
      created_at: new Date().toISOString(),
      workout_sets: sets.map((s) => ({
        exercise_key: String(s.exercise_key),
        exercise_name: String(s.exercise_name),
        position: Number(s.position),
        set_index: Number(s.set_index),
        kind: String(s.kind ?? 'normal'),
        reps: (s.reps as number) ?? null,
        weight_kg: (s.weight_kg as number) ?? null,
        duration_s: (s.duration_s as number) ?? null,
        distance_m: (s.distance_m as number) ?? null,
        rest_s: (s.rest_s as number) ?? null,
        rpe: (s.rpe as number) ?? null,
        completed_at: (s.completed_at as string) ?? null,
      })),
    });
    if (this.trainingWrites === 'lost-response') return route.abort('failed');
    return this.json(route, 200, id);
  }

  private async handleWorkouts(route: Route, url: URL) {
    const req = route.request();
    const user = this.bearerUser(req);
    if (!user) return this.json(route, 401, { code: '42501', message: 'permission denied for table workouts' });
    const eq = (name: string) => {
      const v = url.searchParams.get(name) ?? '';
      return v.startsWith('eq.') ? v.slice(3) : null;
    };

    if (req.method() === 'GET') {
      if (this.trainingReads === 'network') return route.abort('failed');
      if (this.trainingReads === 'server') return this.json(route, 503, { code: 'PGRST000', message: 'mock: service unavailable' });
      if (this.trainingReads === 'unauthorized') return this.json(route, 401, { code: 'PGRST301', message: 'JWT expired' });
      const wanted = eq('user_id');
      // Keyset pagination, as PostgREST evaluates it:
      //   or=(started_at.lt."T",and(started_at.eq."T",id.lt."ID"))  order=started_at.desc,id.desc  limit=N
      const or = url.searchParams.get('or') ?? '';
      const lt = /started_at\.lt\."([^"]+)"/.exec(or)?.[1];
      const idLt = /id\.lt\."([^"]+)"/.exec(or)?.[1];
      if (or && (!lt || !idLt)) return this.json(route, 400, { code: 'PGRST100', message: `mock: unparsable or filter ${or}` });
      if (lt) this.pageRequests += 1;
      if (lt && this.failOlderPages) return route.abort('failed');
      const order = url.searchParams.get('order') ?? '';
      if (!/^started_at\.desc,id\.desc$/.test(order)) return this.json(route, 400, { code: 'PGRST100', message: `mock: unexpected order ${order}` });
      // RLS: only the caller's own workouts exist for them.
      const rows = this.workoutsOf(user.id)
        .filter((w) => !wanted || w.user_id === wanted)
        .filter((w) => !lt || Date.parse(w.started_at) < Date.parse(lt) || (Date.parse(w.started_at) === Date.parse(lt) && w.id < idLt!))
        .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
        .slice(0, Number(url.searchParams.get('limit') ?? 1000));
      return this.json(route, 200, rows);
    }

    if (req.method() === 'DELETE') {
      if (this.trainingWrites === 'network') return route.abort('failed');
      const id = eq('id');
      const w = id ? this.workouts.get(id) : undefined;
      // RLS: deleting someone else's row silently affects 0 rows.
      if (w && w.user_id === user.id) this.workouts.delete(w.id);
      return route.fulfill({ status: 204, headers: this.cors(req) });
    }

    return this.json(route, 405, { message: 'mock: method not allowed' });
  }

  /** workout_templates: owner-only RLS, the planned check constraints, server timestamps. */
  private async handleTemplates(route: Route, url: URL, body: unknown) {
    const req = route.request();
    const user = this.bearerUser(req);
    if (!user) return this.json(route, 401, { code: '42501', message: 'permission denied for table workout_templates' });
    const eq = (name: string) => {
      const v = url.searchParams.get(name) ?? '';
      return v.startsWith('eq.') ? v.slice(3) : null;
    };

    if (req.method() === 'GET') {
      if (this.templateReads === 'network') return route.abort('failed');
      if (this.templateReads === 'unauthorized') return this.json(route, 401, { code: 'PGRST301', message: 'JWT expired' });
      const rows = this.templatesOf(user.id).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
      return this.json(route, 200, rows);
    }

    if (req.method() === 'POST') {
      if (this.templateWrites === 'network') return route.abort('failed');
      if (this.templateWrites === 'unauthorized') return this.json(route, 401, { code: 'PGRST301', message: 'JWT expired' });
      const b = (Array.isArray(body) ? body[0] : body) as Partial<TemplateRow>;
      const existing = this.templates.get(String(b.id));
      if (b.user_id !== user.id || (existing && existing.user_id !== user.id)) {
        return this.json(route, 403, { code: '42501', message: 'new row violates row-level security policy for table "workout_templates"' });
      }
      const days = b.days ?? [];
      const ok =
        typeof b.name === 'string' && b.name.length >= 1 && b.name.length <= 80 &&
        SPORTS.includes(String(b.sport)) &&
        (b.goal === null || ['strength', 'hypertrophy', 'endurance', 'power', 'technique', 'conditioning', 'mobility'].includes(String(b.goal))) &&
        (b.notes === null || (typeof b.notes === 'string' && b.notes.length <= 1000)) &&
        Array.isArray(days) && days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7) && new Set(days).size === days.length &&
        Array.isArray(b.blocks) && b.blocks.length <= 40;
      if (!ok) return this.json(route, 400, { code: '23514', message: 'new row violates check constraint "workout_templates_valid"' });
      const now = new Date().toISOString();
      const row: TemplateRow = {
        id: String(b.id), user_id: user.id, name: b.name!, sport: String(b.sport), goal: b.goal ?? null, notes: b.notes ?? null,
        days, blocks: b.blocks!, created_at: existing?.created_at ?? now, updated_at: now,
      };
      this.templates.set(row.id, row);
      return this.json(route, existing ? 200 : 201, [row]);
    }

    if (req.method() === 'DELETE') {
      if (this.templateWrites === 'network') return route.abort('failed');
      const id = eq('id');
      const t = id ? this.templates.get(id) : undefined;
      if (t && t.user_id === user.id) {
        this.templates.delete(t.id);
        // FK on delete set null (template_id)
        for (const w of this.workouts.values()) if (w.template_id === t.id) w.template_id = null;
      }
      return route.fulfill({ status: 204, headers: this.cors(req) });
    }
    return this.json(route, 405, { message: 'mock: method not allowed' });
  }
}
