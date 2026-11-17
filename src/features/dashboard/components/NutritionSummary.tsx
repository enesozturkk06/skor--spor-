import { StyleSheet, View } from 'react-native';

import { AppText, Card, Tag } from '@/components/ui';
import { colors, spacing } from '@/theme';

import type { DashboardSnapshot } from '../dashboard-data';

const MACRO_COLORS = { protein: colors.orange, carbs: colors.gold, fat: colors.petrolBright } as const;
const trInt = (n: number) => n.toLocaleString('tr-TR');

type Props = { nutrition: DashboardSnapshot['nutrition']; onPress?: () => void };

/**
 * Nutrition tracking is not live: only the daily targets computed from the
 * profile are shown. No intake numbers until the athlete can log meals.
 */
export function NutritionSummary({ nutrition, onPress }: Props) {
  return (
    <Card onPress={onPress} accessibilityLabel="Beslenme: yakında. Günlük hedeflerin" style={styles.card}>
      <View style={styles.titleRow} testID="nutrition-card">
        <AppText variant="overline" color="textMuted">
          Beslenme
        </AppText>
        <Tag label="Yakında" tone="gold" />
      </View>
      <AppText variant="statM" style={styles.kcal}>
        {trInt(nutrition.kcalTarget)}{' '}
        <AppText variant="small" color="textMuted">
          kcal / gün hedefi
        </AppText>
      </AppText>
      <View style={styles.macros}>
        {nutrition.macros.map((m) => (
          <View key={m.key} style={styles.macro}>
            <View style={[styles.dot, { backgroundColor: MACRO_COLORS[m.key] }]} />
            <AppText variant="small" color="textMuted" style={styles.flex}>
              {m.label}
            </AppText>
            <AppText variant="smallStrong">{m.target} g</AppText>
          </View>
        ))}
      </View>
      <AppText variant="small" color="textFaint" style={styles.foot}>
        Hedefler profilinden (kilo ve hedefler) hesaplanır. Öğün takibi açıldığında burada ilerlemen görünecek.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 300 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kcal: { marginTop: spacing.md },
  macros: { gap: spacing.sm, marginTop: spacing.md },
  macro: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  foot: { marginTop: spacing.md },
});
