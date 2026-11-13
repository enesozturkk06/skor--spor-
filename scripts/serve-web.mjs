#!/usr/bin/env node
/**
 * Minimal static server for exported web builds with SPA fallback.
 *
 * The app is a single-page build (app.json → web.output = "single"), so any
 * route such as /welcome or /onboarding must be answered with index.html.
 * Production hosting needs the same rewrite rule; this script mirrors it for
 * local checks and E2E tests. No dependencies.
 *
 * Usage:
 *   node scripts/serve-web.mjs [port]                 serve dist/ (default 8123, or $PORT)
 *   node scripts/serve-web.mjs 8123:dist 8125:dist-mock   serve several builds at once
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/** "8125:dist-mock" → { port: 8125, dir: "dist-mock" }; "8123" → dist. */
function parseTarget(arg) {
  const [port, dir = 'dist'] = String(arg).split(':');
  return { port: Number(port), dir };
}

const args = process.argv.slice(2);
const targets = (args.length ? args : [process.env.PORT ?? 8123]).map(parseTarget);

function serve({ port, dir }) {
  const root = resolve(dir);
  const index = join(root, 'index.html');
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid port in "${port}:${dir}"`);
  if (!existsSync(index)) {
    console.error(`${dir}/index.html not found. Build it first (npm run build:web or node scripts/e2e-build.mjs).`);
    process.exit(1);
  }

  const send = (res, status, file) => {
    res.writeHead(status, {
      'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': file === index ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    createReadStream(file).pipe(res);
  };

  createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    // Block path traversal: the resolved file must stay inside the build folder.
    const file = normalize(join(root, pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isFile()) {
      send(res, 200, file);
      return;
    }
    // Missing asset with an extension → real 404; app route → SPA fallback.
    if (extname(pathname)) {
      res.writeHead(404).end();
      return;
    }
    send(res, 200, index);
  }).listen(port, () => console.log(`SKOR SPOR web build (${dir}) at http://localhost:${port}`));
}

targets.forEach(serve);
