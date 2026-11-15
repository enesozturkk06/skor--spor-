import { StyleSheet, View } from 'react-native';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AppText, Card, ProgressBar, ProgressRing, Tag } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { stagger } from '@/theme/motion';

import type { DashboardSnapshot } from '../dashboard-data';

const MACRO_COLORS = { protein: colors.orange, carbs: colors.gold, fat: colors.petrolBright } as const;
const RING_DELAY = 150;
const MACRO_DELAY = 260;
const trInt = (n: number) => n.toLocaleString('tr-TR');

type Props = { nutrition: DashboardSnapshot['nutrition']; onPress?: () => void; isSample?: boolean };

export function NutritionSummary({ nutrition, onPress, isSample = false }: Props) {
  const left = Math.max(0, nutrition.kcalTarget - nutrition.kcal);
  return (
    <Card onPress={onPress} accessibilityLabel="Beslenme özeti" style={styles.card}>
      <View style={styles.titleRow}>
        <AppText variant="overline" color="textMuted">
          Beslenme
        </AppText>
        {isSample ? <Tag label="Örnek" tone="gold" /> : null}
      </View>
      <View style={styles.row}>
        <ProgressRing
          progress={nutrition.kcal / nutrition.kcalTarget}
          size={96}
          stroke={9}
          color={colors.gold}
          animated
          delay={RING_DELAY}
          accessibilityLabel={`${nutrition.kcal} / ${nutrition.kcalTarget} kalori`}
        >
          <AnimatedNumber value={nutrition.kcal} format={trInt} delay={RING_DELAY} variant="statM" />
          <AppText variant="overline" color="textMuted" style={styles.kcal}>
            kcal
          </AppText>
        </ProgressRing>
        <View style={styles.macros}>
          {nutrition.macros.map((m, i) => (
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
              <ProgressBar progress={m.grams / m.target} color={MACRO_COLORS[m.key]} height={5} animated delay={MACRO_DELAY + i * stagger} />
            </View>
          ))}
        </View>
      </View>
      <AppText variant="small" color="textMuted" style={styles.foot}>
        Hedefe <AppText variant="smallStrong">{trInt(left)} kcal</AppText> kaldı
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 300 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  kcal: { fontSize: 9 },
  macros: { flex: 1, gap: spacing.md },
  macro: { gap: spacing.xs },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  foot: { marginTop: spacing.lg },
});
