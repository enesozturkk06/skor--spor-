/**
 * Module status must match reality: a module whose screens work is 'live'
 * (no "Yakında" tag, no roadmap card); only modules still in development are
 * 'soon' and describe what is coming.
 */
import { expect, test } from '@playwright/test';

import { MODULES } from '../../src/features/modules/modules';

/** Modules with working screens in the app today. Update together with the feature. */
const WORKING = ['home', 'training', 'exercises', 'profile'];

test.describe('Modül durumları', () => {
  test('çalışan modüller "live"; geliştirilenler "soon"', () => {
    const live = Object.values(MODULES).filter((m) => m.status === 'live').map((m) => m.id).sort();
    expect(live).toEqual([...WORKING].sort());
  });

  test('canlı modülün yol haritası boş; geliştirilen modül ne geleceğini söyler', () => {
    for (const m of Object.values(MODULES)) {
      if (m.status === 'live') expect(m.roadmap, m.id).toEqual([]);
      else expect(m.roadmap.length, m.id).toBeGreaterThan(0);
    }
  });
});
