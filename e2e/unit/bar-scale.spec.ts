/** One scale and one color set for every bar chart (BarChart + WeeklyActivityChart). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { BAR_COLORS, barHeight, barScaleMax } from '../../src/components/viz/bar-scale';
import { colors, gradients } from '../../src/theme/tokens';

const ROOT = join(__dirname, '../..');

test.describe('Çubuk grafik ölçeği', () => {
  test('ölçeğin tepesi en büyük değer ya da hedef; boş haftada sıfıra bölme yok', () => {
    expect(barScaleMax([10, 40, 25], 60)).toBe(60);
    expect(barScaleMax([10, 90], 60)).toBe(90);
    expect(barScaleMax([10, 90], 60, 1.15)).toBeCloseTo(103.5);
    expect(barScaleMax([0, 0, 0], 0)).toBe(1);
    expect(Number.isFinite(barHeight(0, barScaleMax([0, 0], 0), 132))).toBe(true);
    expect(barHeight(50, 100, 132)).toBe(66);
    expect(barHeight(-5, 100, 132)).toBe(0);
  });

  test('renkler marka paletinden ve her iki grafik aynı kuralları kullanır', () => {
    expect(BAR_COLORS.highlight).toEqual(gradients.orange);
    expect(BAR_COLORS.filled).toBe(colors.petrolBright);
    expect(BAR_COLORS.empty).toBe(colors.dataTrack);
    for (const file of ['src/components/viz/BarChart.tsx', 'src/features/dashboard/components/WeeklyActivityChart.tsx']) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      expect(src, file).toContain('barScaleMax(');
      expect(src, file).toContain('BAR_COLORS.');
      expect(src, `${file} has its own scale math`).not.toMatch(/Math\.max\([^)]*\.\.\.[^)]*\)\s*\*\s*1\.15/);
    }
  });
});
