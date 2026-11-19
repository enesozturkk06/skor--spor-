/**
 * Phase 2A design system: achievements come only from real data, chart
 * summaries say what the picture shows, and the new accent colors stay
 * readable on the surfaces they are used on.
 */
import { expect, test } from '@playwright/test';

import { describeBars, describeSeries, describeTrend, NOT_ENOUGH_DATA } from '../../src/components/viz/describe';
import { APP_ICONS } from '../../src/components/ui/icon-system';
import { ACHIEVEMENTS, achievementInputs, evaluateAchievements, longestStreak } from '../../src/features/training/achievements';
import type { WorkoutEntry } from '../../src/features/training/types';
import { badgeTiers, colors, sportFamilies, surfaces } from '../../src/theme/tokens';

const day = (d: string, minutes = 45): WorkoutEntry =>
  ({
    id: `w-${d}`,
    userId: 'u',
    name: 'Antrenman',
    sport: 'fitness',
    templateId: null,
    startedAt: new Date(`${d}T10:00:00`).toISOString(),
    endedAt: new Date(new Date(`${d}T10:00:00`).getTime() + minutes * 60_000).toISOString(),
    rpe: null,
    notes: null,
    sets: [],
    sync: 'synced',
  }) as unknown as WorkoutEntry;

/** WCAG relative luminance contrast. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test.describe('Rozetler yalnızca gerçek veriden', () => {
  test('hiç antrenman yokken hiçbir rozet kazanılmaz', () => {
    const states = evaluateAchievements(achievementInputs([], new Map(), 0));
    expect(states.filter((s) => s.earned)).toEqual([]);
    expect(states.every((s) => s.current === 0 || s.metric === 'level')).toBe(true);
  });

  test('eşikler tam: 1 antrenman ilk rozeti açar, 9 antrenman 10’luk rozeti açmaz', () => {
    const one = evaluateAchievements({ workouts: 1, longestStreak: 1, records: 0, level: 1 });
    expect(one.find((s) => s.id === 'first_workout')!.earned).toBe(true);
    const nine = evaluateAchievements({ workouts: 9, longestStreak: 1, records: 0, level: 1 });
    const ten = nine.find((s) => s.id === 'workouts_10')!;
    expect(ten.earned).toBe(false);
    expect(ten.current).toBe(9);
  });

  test('en uzun seri takvim günleriyle sayılır (aynı gün iki antrenman tek gün)', () => {
    expect(longestStreak([day('2026-11-01'), day('2026-11-02'), day('2026-11-02'), day('2026-11-03'), day('2026-11-05')])).toBe(3);
    expect(longestStreak([day('2026-10-31'), day('2026-11-01')])).toBe(2);
    expect(longestStreak([])).toBe(0);
  });

  test('reddedilen (senkronize edilemeyen) antrenmanlar sayılmaz', () => {
    const rejected = { ...day('2026-11-01'), sync: 'rejected' } as unknown as WorkoutEntry;
    expect(achievementInputs([rejected], new Map(), 0).workouts).toBe(0);
  });

  test('rozet ikonları ölçtükleri kavramın ikonunu kullanır', () => {
    for (const a of ACHIEVEMENTS) {
      if (a.metric === 'records') expect(a.icon, a.id).toBe(APP_ICONS.records.outline);
      if (a.metric === 'longestStreak') expect(a.icon, a.id).toBe(APP_ICONS.streak.outline);
    }
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

test.describe('Grafik metin özetleri', () => {
  test('veri yetersizse bunu söyler, değer uydurmaz', () => {
    expect(describeSeries('Haftalık dakika', [])).toBe(`Haftalık dakika: ${NOT_ENOUGH_DATA}.`);
    expect(describeSeries('Haftalık dakika', [40])).toBe(`Haftalık dakika: ${NOT_ENOUGH_DATA}.`);
    expect(describeTrend('1RM', [{ label: 'Eki', value: 80 }])).toContain(NOT_ENOUGH_DATA);
    expect(describeBars('Bu hafta', [])).toContain(NOT_ENOUGH_DATA);
  });

  test('seri, çubuk ve trend özetleri değerleri birimiyle verir', () => {
    expect(describeSeries('Haftalık dakika', [0, 55, 30], 'dk')).toBe('Haftalık dakika: 3 değer, en düşük 0 dk, en yüksek 55 dk, son 30 dk.');
    expect(describeBars('Bu hafta', [{ label: 'Pzt', value: 30 }, { label: 'Sal', value: 0 }], 'dk', 60)).toBe('Bu hafta: Pzt 30 dk, Sal 0 dk. Hedef 60 dk.');
    expect(describeTrend('Tahmini 1RM', [{ label: 'Eki', value: 80 }, { label: 'Kas', value: 92.5 }], 'kg')).toBe(
      'Tahmini 1RM: Eki 80 kg, Kas 92,5 kg (+12,5 kg). En yüksek Kas 92,5 kg.',
    );
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `H${i + 1}`, value: i }));
    expect(describeBars('20 hafta', many, 'dk')).toBe('20 hafta: 20 dönem, toplam 190 dk, en yüksek H20 19 dk.');
  });
});

test.describe('Renk ve yüzey sistemi', () => {
  test('marka renkleri değişmedi', () => {
    expect([colors.petrol, colors.orange, colors.gold, colors.bg]).toEqual(['#073C38', '#FF7138', '#D6B77A', '#080D0D']);
  });

  test('branş vurgu renkleri ve rozet tonları koyu yüzeylerde okunur (≥ 3:1, ikon/büyük metin)', () => {
    for (const surface of [surfaces.base.backgroundColor, surfaces.raised.backgroundColor, colors.bg]) {
      for (const [family, f] of Object.entries(sportFamilies)) expect(contrast(f.accentLight, surface), `${family} on ${surface}`).toBeGreaterThanOrEqual(3);
      for (const [tier, t] of Object.entries(badgeTiers)) expect(contrast(t.ringLight, t.face), tier).toBeGreaterThanOrEqual(3);
    }
  });

  test('her branş ailesinin kendine özgü bir motifi var', () => {
    const motifs = Object.values(sportFamilies).map((f) => f.motif);
    expect(new Set(motifs).size).toBe(motifs.length);
  });
});
