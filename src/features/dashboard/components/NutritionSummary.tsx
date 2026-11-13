import { StyleSheet, View } from 'react-native';

import { AppText, Card, ProgressBar, ProgressRing } from '@/components/ui';
import { colors, spacing } from '@/theme';

import type { DashboardSnapshot } from '../dashboard-data';

const MACRO_COLORS = { protein: colors.orange, carbs: colors.gold, fat: colors.petrolBright } as const;

export function NutritionSummary({ nutrition, onPress }: { nutrition: DashboardSnapshot['nutrition']; onPress?: () => void }) {
  const left = Math.max(0, nutrition.kcalTarget - nutrition.kcal);
  return (
    <Card onPress={onPress} accessibilityLabel="Beslenme özeti" style={styles.card}>
      <AppText variant="overline" color="textMuted">
        Beslenme
      </AppText>
      <View style={styles.row}>
        <ProgressRing progress={nutrition.kcal / nutrition.kcalTarget} size={96} stroke={9} color={colors.gold} accessibilityLabel={`${nutrition.kcal} / ${nutrition.kcalTarget} kalori`}>
          <AppText variant="statM">{nutrition.kcal.toLocaleString('tr-TR')}</AppText>
          <AppText variant="overline" color="textMuted" style={styles.kcal}>
            kcal
          </AppText>
        </ProgressRing>
        <View style={styles.macros}>
          {nutrition.macros.map((m) => (
            <View key={m.key} style={styles.macro}>
              <View style={styles.macroHead}>
                <AppText variant="small" color="textMuted">
                  {m.label}
                </AppText>
                <AppText variant="smallStrong">
                  {m.grams}
                  <AppText variant="small" color="textFaint">
                    /{m.target}g
                  </AppText>
                </AppText>
              </View>
              <ProgressBar progress={m.grams / m.target} color={MACRO_COLORS[m.key]} height={5} />
            </View>
          ))}
        </View>
      </View>
      <AppText variant="small" color="textMuted" style={styles.foot}>
        Hedefe <AppText variant="smallStrong">{left.toLocaleString('tr-TR')} kcal</AppText> kaldı
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 300 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  kcal: { fontSize: 9 },
  macros: { flex: 1, gap: spacing.md },
  macro: { gap: spacing.xs },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  foot: { marginTop: spacing.lg },
});
