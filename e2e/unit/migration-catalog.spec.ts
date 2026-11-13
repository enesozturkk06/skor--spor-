/**
 * Guards against drift between the app catalog (sports, goals, limits) and
 * the database rules in the athlete_profiles migration. If someone adds a
 * sport in the app but not in SQL (or vice versa), saves would start failing
 * in production — this test fails first. Pure file check, no database.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { GOALS, LIMITS, SPORTS } from '../../src/features/athlete/catalog';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261113000000_athlete_profiles.sql'), 'utf8');

/** Body of one named check constraint (from `add constraint <name> check (` to the closing `);`). */
function constraint(name: string): string {
  const start = sql.indexOf(`add constraint ${name} check`);
  expect(start, `constraint ${name} exists`).toBeGreaterThan(-1);
  return sql.slice(start, sql.indexOf(');', start));
}

const quoted = (s: string) => [...s.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
const sorted = (xs: readonly string[]) => [...xs].sort();

test.describe('Migration ↔ uygulama kataloğu', () => {
  const sportIds = sorted(SPORTS.map((s) => s.id));
  const goalIds = sorted(GOALS.map((g) => g.id));

  test('ana branş listesi uygulamadaki branşlarla birebir aynı', () => {
    expect(quoted(constraint('athlete_profiles_primary_sport_valid'))).toEqual(sportIds);
  });

  test('ek branş listesi ve üst sınırı uygulamayla aynı', () => {
    const body = constraint('athlete_profiles_secondary_sports_valid');
    expect(quoted(body)).toEqual(sportIds);
    expect(body).toContain(`cardinality(secondary_sports) <= ${LIMITS.secondarySportsMax}`);
  });

  test('hedef listesi ve üst sınırı uygulamayla aynı', () => {
    const body = constraint('athlete_profiles_goals_valid');
    expect(quoted(body)).toEqual(goalIds);
    expect(body).toContain(`cardinality(goals) <= ${LIMITS.goalsMax}`);
  });

  test('yaş, boy ve kilo aralıkları uygulamayla aynı', () => {
    expect(constraint('athlete_profiles_age_range')).toContain(`age between ${LIMITS.age.min} and ${LIMITS.age.max}`);
    expect(constraint('athlete_profiles_height_range')).toContain(
      `height_cm between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max}`,
    );
    expect(constraint('athlete_profiles_weight_range')).toContain(
      `weight_kg between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max}`,
    );
  });

  test('her branş kimliği uzunluk sınırının içinde', () => {
    for (const id of sportIds) expect(id.length, id).toBeLessThanOrEqual(32);
  });

  test('migration yasaklı ve riskli komutlar içermiyor', () => {
    const code = sql.replace(/--.*$/gm, '').toLowerCase();
    expect(code).not.toMatch(/\bdrop\s+table\b/);
    expect(code).not.toMatch(/\btruncate\b/);
    expect(code).not.toMatch(/\bdelete\s+from\b/);
    expect(code).not.toMatch(/\b(alter|update|insert\s+into)\s+auth\./);
    expect(code).not.toMatch(/service_role|security\s+definer/);
  });
});
