/**
 * SKOR SPOR icon rules (src/components/ui/icon-system.ts):
 * one glyph per meaning, outline style (filled only for the active tab),
 * sports drawn with the project's own SVG set.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { expect, test } from '@playwright/test';

import { GOALS, SPORTS } from '../../src/features/athlete/catalog';
import { MODALITY_META } from '../../src/features/exercises/catalog';
import { MODULES } from '../../src/features/modules/modules';
import { ICON_NAMES } from '../../src/components/ui/icon-names';
import { APP_ICONS, SOLID_BY_CONVENTION } from '../../src/components/ui/icon-system';
import { SPORT_GLYPHS } from '../../src/components/ui/sport-glyphs';

const ROOT = join(__dirname, '../..');
const MDI = JSON.parse(
  readFileSync(join(ROOT, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'), 'utf8'),
) as Record<string, number>;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

/** glyph → the meanings it stands for, across every table that gives icons a meaning. */
function meaningsByGlyph(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (glyph: string, meaning: string) => map.set(glyph, new Set([...(map.get(glyph) ?? []), meaning]));
  for (const [concept, icon] of Object.entries(APP_ICONS)) {
    add(icon.outline, concept);
    if ('filled' in icon) add(icon.filled, concept);
  }
  for (const g of GOALS) add(g.icon, `goal:${g.id}`);
  for (const [id, m] of Object.entries(MODALITY_META)) add(m.icon, `modality:${id}`);
  for (const s of SPORTS) add(s.icon, `sport:${s.id}`);
  return map;
}

test.describe('İkon sistemi', () => {
  test('her uygulama kavramının tek bir ikonu var; iki kavram aynı ikonu paylaşmaz', () => {
    const owners = new Map<string, string>();
    for (const [concept, icon] of Object.entries(APP_ICONS)) {
      for (const glyph of 'filled' in icon ? [icon.outline, icon.filled] : [icon.outline]) {
        expect(owners.get(glyph), `${glyph} is used by ${owners.get(glyph)} and ${concept}`).toBeUndefined();
        owners.set(glyph, concept);
      }
    }
  });

  test('hiçbir ikon iki farklı anlamda kullanılmaz (kavram, hedef, modalite, branş)', () => {
    const shared = [...meaningsByGlyph()].filter(([, m]) => m.size > 1).map(([g, m]) => `${g}: ${[...m].join(' + ')}`);
    expect(shared).toEqual([]);
  });

  test('modüller ve sekmeler kavram ikonlarını kayıttan alır', () => {
    for (const [id, mod] of Object.entries(MODULES)) {
      expect(mod.icon, id).toBe(APP_ICONS[id as keyof typeof APP_ICONS].outline);
    }
    const tabBar = readFileSync(join(ROOT, 'src/components/navigation/TabBar.tsx'), 'utf8');
    const tabTable = /TAB_META[^=]*=\s*\{([\s\S]*?)\n\};/.exec(tabBar)?.[1] ?? '';
    expect(tabTable, 'tab icons come from APP_ICONS').not.toMatch(/icon(Active)?:\s*'/);
  });

  test('branşlar SKOR SPOR SVG setini kullanır: her branşın kendi ikonu var', () => {
    expect(SPORTS.map((s) => s.icon)).toEqual(SPORTS.map((s) => `sport-${s.id}`));
    expect(Object.keys(SPORT_GLYPHS).sort()).toEqual(SPORTS.map((s) => `sport-${s.id}`).sort());
    for (const [name, shapes] of Object.entries(SPORT_GLYPHS)) {
      expect(shapes.length, name).toBeGreaterThan(0);
      // 24×24 grid: circles stay on the canvas.
      for (const s of shapes) if (s.kind === 'circle') expect(s.cx - s.r >= 0 && s.cx + s.r <= 24 && s.cy - s.r >= 0 && s.cy + s.r <= 24, name).toBe(true);
    }
  });

  test('arayüz ikonları outline: dolu ikon yalnızca aktif sekmede (ve kayıtlı istisnalarda)', () => {
    const registered = new Set<string>(ICON_NAMES);
    const allowedFilled = new Set<string>([
      ...SOLID_BY_CONVENTION,
      ...Object.values(APP_ICONS).flatMap((i) => ('filled' in i ? [i.filled] : [])),
    ]);
    const violations: string[] = [];
    for (const file of sourceFiles(join(ROOT, 'src'))) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      if (rel.endsWith('icon-names.ts') || rel.endsWith('icon-system.ts')) continue;
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/['"]([a-z0-9-]+)['"]/g)) {
        const name = m[1];
        if (!registered.has(name) || name.endsWith('-outline') || !(`${name}-outline` in MDI)) continue;
        // Active-tab glyphs are referenced through APP_ICONS.*.filled, never as literals.
        if (SOLID_BY_CONVENTION.includes(name as never)) continue;
        violations.push(`${rel}: '${name}' → use '${name}-outline'${allowedFilled.has(name) ? ' (filled only via APP_ICONS for the active tab)' : ''}`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('kayıtlı her ikon Material Design Icons içinde var', () => {
    expect(ICON_NAMES.filter((n) => !(n in MDI))).toEqual([]);
  });
});
