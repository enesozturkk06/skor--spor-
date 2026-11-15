import { expect, test } from '@playwright/test';

import { countUpValue, easeOutCubic } from '../../src/components/motion/count-up';

test.describe('Sayaç (count-up) matematiği', () => {
  test('eğri 0→1 arasında, monoton ve sınırlı', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(easeOutCubic(0.5), 'ease-out: past halfway at half time').toBeGreaterThan(0.5);
  });

  test('başlangıç, ara ve bitiş değerleri', () => {
    expect(countUpValue(0, 74, 0, 650)).toBe(0);
    const mid = countUpValue(0, 74, 325, 650);
    expect(mid).toBeGreaterThan(37);
    expect(mid).toBeLessThan(74);
    expect(countUpValue(0, 74, 650, 650)).toBe(74);
    expect(countUpValue(0, 74, 9999, 650), 'never overshoots').toBe(74);
  });

  test('aşağı sayma, ondalık ve sıfır süre', () => {
    expect(countUpValue(80, 60, 650, 650)).toBe(60);
    expect(countUpValue(80, 60, 100, 650)).toBeLessThan(80);
    expect(countUpValue(0, 7.4, 200, 650, 1)).toBe(Math.round(countUpValue(0, 7.4, 200, 650, 1) * 10) / 10);
    expect(countUpValue(0, 74, 0, 0), 'zero duration jumps to target').toBe(74);
  });
});
