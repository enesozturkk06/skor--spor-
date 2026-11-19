#!/usr/bin/env node
/**
 * Builds every platform icon from ONE vector source: the SKOR SPOR mark
 * (same geometry as src/components/ui/Logo.tsx) on brand colors.
 * Run: npm run icons:build — renders with the Playwright Chromium the test
 * suite already installs (no extra package). Output is committed;
 * e2e/unit/brand-assets.spec.ts checks sizes and transparency.
 *
 *   assets/icon.png                     1024  iOS/default — opaque, full bleed
 *   assets/icon-dark.png                1024  iOS 18 dark appearance
 *   assets/icon-tinted.png              1024  iOS 18 tinted (grayscale)
 *   assets/android-icon-foreground.png  1024  adaptive foreground (mark in the 61% safe circle)
 *   assets/android-icon-background.png  1024  adaptive background
 *   assets/android-icon-monochrome.png  1024  themed icons (Android 13+)
 *   assets/splash-icon.png              1024  splash (transparent; logo tile)
 *   assets/favicon.png                   256  web (Expo turns it into favicon.ico)
 *   public/favicon.svg                         web, vector
 *   public/apple-touch-icon.png          180  web "add to home screen" on iOS
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const C = {
  petrol: '#073C38',
  petrolBright: '#0D5A52',
  petrolDeep: '#042926',
  orange: '#FF7138',
  orangeDeep: '#E2551F',
  gold: '#D6B77A',
  ink: '#080D0D',
  cream: '#F4F1EA',
};

/* The mark, in the 48×48 space of Logo.tsx (bars span x 11–37, y 11–37). */
const BARS = {
  short: 'M11 37 L13 30 L19 30 L17 37 Z',
  tall: 'M17 37 L25 11 L32 11 L24 37 Z',
  mid: 'M27 37 L31 24 L37 24 L33 37 Z',
};

/** The three bars centered at (cx, cy), `size` = width of the mark (26 units). */
function mark({ cx, cy, size, colors = 'brand', shadow = true }) {
  const s = size / 26;
  const fill =
    colors === 'brand'
      ? { short: `${C.cream}`, tall: 'url(#barOrange)', mid: C.gold, shortOpacity: 0.92 }
      : colors === 'white'
        ? { short: '#FFFFFF', tall: '#FFFFFF', mid: '#FFFFFF', shortOpacity: 1 }
        : { short: '#FFFFFF', tall: '#E6E6E6', mid: '#B8B8B8', shortOpacity: 1 };
  return `<g transform="translate(${cx - 24 * s} ${cy - 24 * s}) scale(${s})"${shadow ? ' filter="url(#barShadow)"' : ''}>
    <path d="${BARS.short}" fill="${fill.short}" fill-opacity="${fill.shortOpacity}"/>
    <path d="${BARS.tall}" fill="${fill.tall}"/>
    <path d="${BARS.mid}" fill="${fill.mid}"/>
  </g>`;
}

const DEFS = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.petrolBright}"/>
    <stop offset="0.55" stop-color="${C.petrol}"/>
    <stop offset="1" stop-color="${C.petrolDeep}"/>
  </linearGradient>
  <radialGradient id="light" cx="0.12" cy="0.06" r="0.75">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ember" cx="0.98" cy="1" r="0.62">
    <stop offset="0" stop-color="${C.orange}" stop-opacity="0.22"/>
    <stop offset="1" stop-color="${C.orange}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="inkGlow" cx="0.2" cy="0.1" r="0.85">
    <stop offset="0" stop-color="${C.petrolBright}" stop-opacity="0.55"/>
    <stop offset="1" stop-color="${C.petrolBright}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="barOrange" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.orange}"/>
    <stop offset="1" stop-color="${C.orangeDeep}"/>
  </linearGradient>
  <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.07"/>
    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
  <filter id="barShadow" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="0.9" stdDeviation="0.9" flood-color="#000" flood-opacity="0.35"/>
  </filter>
</defs>`;

/** The brand's forward-leaning "score lines", very faint, behind the mark. */
const SCORE_LINES = `<g>
  <path d="M640 -40 L760 -40 L420 1064 L300 1064 Z" fill="url(#lineFade)"/>
  <path d="M800 -40 L850 -40 L510 1064 L460 1064 Z" fill="url(#lineFade)"/>
</g>`;

const svg = (size, body, view = size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${view} ${view}">${DEFS}${body}</svg>`;

/** Full-bleed petrol tile (iOS masks the corners itself). */
const petrolSquare = (withMark) =>
  `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#light)"/><rect width="1024" height="1024" fill="url(#ember)"/>${SCORE_LINES}${withMark ? mark({ cx: 512, cy: 512, size: 540 }) : ''}`;

/** The rounded logo tile of Logo.tsx (13/48 radius, gold hairline). */
const tile = (size) => {
  const r = (13 / 48) * size;
  const b = (1.5 / 48) * size;
  return `<rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#light)"/>
    <rect x="${b / 2}" y="${b / 2}" width="${size - b}" height="${size - b}" rx="${r - b / 2}" fill="none" stroke="${C.gold}" stroke-opacity="0.38" stroke-width="${b}"/>
    ${mark({ cx: size / 2, cy: size / 2, size: (26 / 48) * size, shadow: size >= 128 })}`;
};

const OUT = [
  ['assets/icon.png', 1024, svg(1024, petrolSquare(true)), false],
  [
    'assets/icon-dark.png',
    1024,
    svg(1024, `<rect width="1024" height="1024" fill="${C.ink}"/><rect width="1024" height="1024" fill="url(#inkGlow)"/>${mark({ cx: 512, cy: 512, size: 540 })}`),
    false,
  ],
  ['assets/icon-tinted.png', 1024, svg(1024, `<rect width="1024" height="1024" fill="#000"/>${mark({ cx: 512, cy: 512, size: 540, colors: 'gray', shadow: false })}`), false],
  // Adaptive icon: 108dp canvas, launchers show the central 72dp and may crop to a 66dp circle.
  ['assets/android-icon-foreground.png', 1024, svg(1024, mark({ cx: 512, cy: 512, size: 410 })), true],
  ['assets/android-icon-background.png', 1024, svg(1024, petrolSquare(false)), false],
  ['assets/android-icon-monochrome.png', 1024, svg(1024, mark({ cx: 512, cy: 512, size: 410, colors: 'white', shadow: false })), true],
  ['assets/splash-icon.png', 1024, svg(1024, tile(1024)), true],
  ['assets/favicon.png', 256, svg(256, tile(256)), true],
  ['public/apple-touch-icon.png', 180, svg(180, petrolSquare(true), 1024), false],
];

mkdirSync('public', { recursive: true });
writeFileSync('public/favicon.svg', `${svg(48, tile(48))}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [file, size, markup, transparent] of OUT) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await page.locator('svg').screenshot({ path: file, omitBackground: transparent });
  console.log(`  ${file} (${size}×${size}${transparent ? ', transparent' : ''})`);
}
await browser.close();
console.log('  public/favicon.svg (vector)');
