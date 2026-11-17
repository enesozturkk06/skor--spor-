#!/usr/bin/env node
/**
 * Cloudflare Pages build guard — runs before `expo export` on every Pages build:
 *
 *   node scripts/pages-guard.mjs && npx expo export -p web
 *
 * The public test site is a DEMO: no backend, user data stays in the visitor's
 * browser. The guard stops the build when anything could put a backend,
 * a secret or an internal test page into the web bundle:
 *
 *   Environment
 *   - ANY EXPO_PUBLIC_* variable (Expo inlines every one of them into the
 *     bundle; the demo needs none — this also covers unknown or misspelt names)
 *   - names that look like backend credentials: *SUPABASE*, *SERVICE_ROLE*,
 *     DATABASE_URL, POSTGRES*, PG*PASSWORD, *JWT_SECRET*
 *   Files
 *   - a .env / .env.* file in the checkout (Expo loads them; .env.example excepted)
 *   - an .env.example that is not an empty template
 *   - app.config.js/ts (dynamic config), babel.config.* / metro.config.*
 *     (both can inline environment values) — review the guard before adding them
 *   - a web output other than "single" (the hosting relies on SPA fallback)
 *   - a Supabase URL / key / JWT written into app.json or into src/
 *
 * Only NAMES (variable names, file paths) are printed — never a value.
 *
 * Usage: node scripts/pages-guard.mjs [--root=<dir>]   (default: current directory)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const rootArg = process.argv.find((a) => a.startsWith('--root='));
const root = resolve(rootArg ? rootArg.slice('--root='.length) : process.cwd());
const problems = [];

/* ------------------------------------------------------------- environment */

// Windows environment names are case-insensitive; compare upper-cased.
const names = [...new Set(Object.keys(process.env).map((k) => k.toUpperCase()))].sort();
const CREDENTIAL = /SUPABASE|SERVICE_ROLE|DATABASE_URL|^POSTGRES|^PG.*PASSWORD|JWT_SECRET/;
for (const name of names) {
  if (name.startsWith('EXPO_PUBLIC_')) {
    problems.push(`environment variable ${name} is set (EXPO_PUBLIC_ values are inlined into the public bundle; the demo needs none)`);
  } else if (CREDENTIAL.test(name)) {
    problems.push(`environment variable ${name} is set (backend credentials are not allowed in Pages builds)`);
  }
}

/* ---------------------------------------------------------------- .env files */

for (const file of readdirSync(root).sort()) {
  if (!/^\.env(\..+)?$/i.test(file)) continue;
  if (file === '.env.example') {
    // The tracked template must stay empty: no assignment may carry a value.
    const filled = readFileSync(join(root, file), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .filter((l) => /^(export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S/.test(l))
      .map((l) => l.replace(/^export\s+/, '').split('=')[0].trim());
    for (const key of filled) problems.push(`.env.example has a value for ${key} (the template must stay empty)`);
    continue;
  }
  problems.push(`${file} is present in the build checkout (Expo would inline its values)`);
}

/* ------------------------------------------------------------- build config */

for (const file of ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs']) {
  if (existsSync(join(root, file))) problems.push(`${file} found: dynamic config could inject a backend; review the guard before using it`);
}
for (const file of readdirSync(root).filter((f) => /^(babel|metro)\.config\.(c|m)?(js|ts|json)$/.test(f)).sort()) {
  problems.push(`${file} found: it can inline environment values into the bundle; review the guard before using it`);
}

const appJson = join(root, 'app.json');
if (!existsSync(appJson)) {
  problems.push('app.json not found');
} else {
  let output;
  try {
    output = JSON.parse(readFileSync(appJson, 'utf8'))?.expo?.web?.output;
  } catch {
    problems.push('app.json is not valid JSON');
  }
  if (output !== undefined && output !== 'single') problems.push(`app.json expo.web.output is "${output}", expected "single" (SPA hosting)`);
}

/* ------------------------------------------- secrets written into the code */

// A real Supabase project URL, a Supabase key, or a JWT (legacy anon/service keys).
const SECRET_LIKE = [/https?:\/\/[a-z0-9-]+\.supabase\.(co|in)\b/i, /\bsb_(publishable|secret)_[A-Za-z0-9_-]{16,}/, /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./];

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}
const scan = [...(existsSync(appJson) ? [appJson] : []), ...(existsSync(join(root, 'src')) ? [...walk(join(root, 'src'))] : [])];
for (const file of scan) {
  if (!/\.(tsx?|jsx?|mjs|cjs|json)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (SECRET_LIKE.some((re) => re.test(text))) {
    problems.push(`${relative(root, file).replace(/\\/g, '/')} contains a Supabase URL, key or token (never hard-code backend values)`);
  }
}

/* ------------------------------------------------------------------ result */

const where = process.env.CF_PAGES === '1' ? 'Cloudflare Pages' : 'local';
if (problems.length) {
  console.error(`\n[pages-guard] BUILD STOPPED (${where}) — the public test site must be a backend-free demo:\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('\nRemove the items above from the Pages project settings / repository and retry.\n');
  process.exit(1);
}
console.log(`[pages-guard] OK (${where}): demo build — no EXPO_PUBLIC_ or backend variables, no .env, no hard-coded backend values, web output "single".`);
