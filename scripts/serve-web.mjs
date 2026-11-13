#!/usr/bin/env node
/**
 * Minimal static server for the exported web build (dist/) with SPA fallback.
 *
 * The app is a single-page build (app.json → web.output = "single"), so any
 * route such as /welcome or /onboarding must be answered with index.html.
 * Production hosting needs the same rewrite rule; this script mirrors it for
 * local checks and E2E tests. No dependencies.
 *
 * Usage: node scripts/serve-web.mjs [port]   (default 8123, or $PORT)
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve('dist');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8123);
const INDEX = join(ROOT, 'index.html');

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

if (!existsSync(INDEX)) {
  console.error('dist/index.html not found. Run "npm run build:web" first.');
  process.exit(1);
}

function send(res, status, file) {
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': file === INDEX ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}

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
  // Block path traversal: the resolved file must stay inside dist/.
  const file = normalize(join(ROOT, pathname));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
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
  send(res, 200, INDEX);
}).listen(PORT, () => console.log(`SKOR SPOR web build at http://localhost:${PORT}`));
