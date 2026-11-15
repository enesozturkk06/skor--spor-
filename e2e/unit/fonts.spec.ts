/**
 * The subset fonts in assets/fonts (built by `npm run fonts:build`) must stay
 * complete and current: every registered icon present, every Turkish letter
 * present, nothing stale. Pure file checks with a tiny TTF cmap reader.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { ICON_NAMES } from '../../src/components/ui/icon-names';

const ROOT = join(__dirname, '../..');
const FONTS = join(ROOT, 'assets/fonts');

/** Unicode code points mapped by a TrueType font (cmap formats 4 and 12). */
function codepoints(file: string): Set<number> {
  const buf = readFileSync(file);
  const numTables = buf.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('latin1', rec, rec + 4) === 'cmap') cmap = buf.readUInt32BE(rec + 8);
  }
  if (cmap < 0) throw new Error(`no cmap in ${file}`);
  const out = new Set<number>();
  const subtables = buf.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const off = cmap + buf.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = buf.readUInt16BE(off);
    if (format === 4) {
      const segX2 = buf.readUInt16BE(off + 6);
      const ends = off + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const rangeOffsets = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = buf.readUInt16BE(ends + s * 2);
        const start = buf.readUInt16BE(starts + s * 2);
        const delta = buf.readInt16BE(deltas + s * 2);
        const ro = buf.readUInt16BE(rangeOffsets + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const glyph = ro === 0 ? (c + delta) & 0xffff : buf.readUInt16BE(rangeOffsets + s * 2 + ro + (c - start) * 2);
          if (glyph !== 0) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = buf.readUInt32BE(off + 12);
      for (let g = 0; g < groups; g++) {
        const base = off + 16 + g * 12;
        const start = buf.readUInt32BE(base);
        const end = buf.readUInt32BE(base + 4);
        for (let c = start; c <= end; c++) out.add(c);
      }
    }
  }
  return out;
}

const TEXT_FONTS = [
  'BarlowCondensed_600SemiBold',
  'BarlowCondensed_700Bold',
  'BarlowCondensed_800ExtraBold',
  'BarlowCondensed_800ExtraBold_Italic',
  'Inter_400Regular',
  'Inter_500Medium',
  'Inter_600SemiBold',
  'Inter_700Bold',
];
const MUST_RENDER = 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789 .,:;!?%/()+-–—…·×²₺€"\'@#&*';

test.describe('Font varlıkları', () => {
  for (const name of TEXT_FONTS) {
    test(`${name}: Türkçe karakterler ve noktalama eksiksiz`, () => {
      const cps = codepoints(join(FONTS, `${name}.ttf`));
      const missing = [...MUST_RENDER].filter((ch) => !cps.has(ch.codePointAt(0)!));
      expect(missing, `missing glyphs in ${name}`).toEqual([]);
    });
  }

  test('ikon fontu kayıtlı tüm ikonları içerir ve güncel', () => {
    const glyphMap = JSON.parse(readFileSync(join(FONTS, 'skor-icons.json'), 'utf8')) as Record<string, number>;
    expect(Object.keys(glyphMap).sort(), 'run `npm run fonts:build` after editing icon-names.ts').toEqual([...ICON_NAMES].sort());
    const cps = codepoints(join(FONTS, 'skor-icons.ttf'));
    const missing = Object.entries(glyphMap).filter(([, cp]) => !cps.has(cp)).map(([n]) => n);
    expect(missing, 'glyphs missing from skor-icons.ttf').toEqual([]);
  });

  test('alt küme fontlar küçük kalır', () => {
    for (const name of TEXT_FONTS) {
      expect(readFileSync(join(FONTS, `${name}.ttf`)).length, name).toBeLessThan(110 * 1024);
    }
    expect(readFileSync(join(FONTS, 'skor-icons.ttf')).length).toBeLessThan(40 * 1024);
  });

  test('lisans dosyaları fontlarla birlikte', () => {
    for (const f of ['OFL-Inter.txt', 'OFL-BarlowCondensed.txt', 'LICENSES.md']) {
      expect(readFileSync(join(FONTS, f), 'utf8').length, f).toBeGreaterThan(200);
    }
  });
});
