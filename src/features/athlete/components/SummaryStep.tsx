import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { enter } from '@/components/motion/entrance';
import { AppText, Chip, Icon, Tag } from '@/components/ui';
import { buildDashboardSnapshot } from '@/features/dashboard/dashboard-data';
import { initials } from '@/lib/format';
import { colors, fonts, gradients, radius, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import { getGoal, getSport, type GoalId, type SportId } from '../catalog';
import { bmi, bmiBand } from '../metrics';

type Props = {
  name: string;
  primary: SportId;
  secondary: SportId[];
  goals: GoalId[];
  age: number;
  heightCm: number;
  weightKg: number;
};

const CARD_DELAY = 80;
const trInt = (n: number) => n.toLocaleString('tr-TR');
const tr1 = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * The athlete's card revealed at the end of onboarding. Every number here is
 * derived from the athlete's own answers (targets use the same formulas as
 * the dashboard) — nothing is sample data.
 */
export function SummaryStep({ name, primary, secondary, goals, age, heightCm, weightKg }: Props) {
  const sport = getSport(primary);
  const bmiValue = bmi(heightCm, weightKg);
  const targets = buildDashboardSnapshot({
    userId: 'preview',
    primarySport: primary,
    secondarySports: secondary,
    goals,
    age,
    heightCm,
    weightKg,
    createdAt: '',
    updatedAt: '',
  });
  const item = (i: number) => enter(i, { delay: CARD_DELAY + 260 });

  return (
    <View style={styles.wrap} testID="athlete-card-step">
      <Animated.View entering={enter(0)}>
        <AppText variant="display" accessibilityRole="header">
          Sporcu kartın hazır
        </AppText>
        <AppText variant="body" color="textMuted" style={styles.lead}>
          Bilgilerini kontrol et; istersen geri dönüp değiştirebilirsin.
        </AppText>
      </Animated.View>

      <Animated.View
        entering={ZoomIn.duration(520).delay(CARD_DELAY).easing(easing.out).reduceMotion(ReduceMotion.System)}
        style={styles.card}
        testID="athlete-card"
      >
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.cardAccent} />

        <Animated.View entering={item(0)} style={styles.identity}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initials(name)}</AppText>
          </View>
          <View style={styles.identityText}>
            <AppText variant="overline" color="gold">
              SKOR SPOR sporcusu
            </AppText>
            <AppText variant="h1" numberOfLines={1}>
              {name}
            </AppText>
          </View>
        </Animated.View>

        <Animated.View entering={item(1)} style={styles.sportRow}>
          <View style={styles.sportIcon}>
            <Icon name={sport.icon} size={28} color="textOnOrange" />
          </View>
          <View>
            <AppText variant="overline" color="textMuted">
              Ana branş
            </AppText>
            <AppText variant="h2">{sport.label}</AppText>
          </View>
        </Animated.View>

        {secondary.length ? (
          <Animated.View entering={item(2)} style={styles.chips}>
            {secondary.map((id) => {
              const s = getSport(id);
              return <Chip key={id} label={s.label} icon={s.icon} />;
            })}
          </Animated.View>
        ) : null}

        <Animated.View entering={item(3)} style={styles.chips}>
          {goals.map((id) => {
            const g = getGoal(id);
            return <Chip key={id} label={g.label} icon={g.icon} selected tone="gold" />;
          })}
        </Animated.View>

        <Animated.View entering={item(4)} style={styles.metrics}>
          {[
            { label: 'Yaş', value: age, unit: 'yıl', format: trInt },
            { label: 'Boy', value: heightCm, unit: 'cm', format: trInt },
            { label: 'Kilo', value: weightKg, unit: 'kg', format: Number.isInteger(weightKg) ? trInt : tr1, decimals: 1 },
          ].map((m, i) => (
            <View key={m.label} style={[styles.metric, i > 0 && styles.metricDivider]}>
              <AppText variant="overline" color="textMuted">
                {m.label}
              </AppText>
              <AppText variant="statM" accessibilityLabel={`${m.label} ${m.format(m.value)} ${m.unit}`}>
                <AnimatedNumber value={m.value} decimals={m.decimals} format={m.format} delay={CARD_DELAY + 380} variant="statM" />
                <AppText variant="small" color="textMuted">
                  {' '}
                  {m.unit}
                </AppText>
              </AppText>
            </View>
          ))}
        </Animated.View>
      </Animated.View>

      <Animated.View entering={item(5)} style={styles.targets}>
        <AppText variant="overline" color="gold">
          Senin hedeflerin
        </AppText>
        <View style={styles.targetRow}>
          <View style={styles.target}>
            <Icon name="timer-outline" size={18} color="orange" />
            <AppText variant="small" color="textMuted">
              Günlük antrenman
            </AppText>
            <AppText variant="title" testID="target-minutes">
              {targets.dailyTargetMinutes} dk
            </AppText>
          </View>
          <View style={styles.target}>
            <Icon name="food-apple-outline" size={18} color="gold" />
            <AppText variant="small" color="textMuted">
              Günlük enerji
            </AppText>
            <AppText variant="title" testID="target-kcal">
              {trInt(targets.nutrition.kcalTarget)} kcal
            </AppText>
          </View>
          {bmiValue ? (
            <View style={styles.target}>
              <Icon name="scale-bathroom" size={18} color="textMuted" />
              <AppText variant="small" color="textMuted">
                VKİ
              </AppText>
              <View style={styles.bmiRow}>
                <AppText variant="title" testID="summary-bmi">
                  {tr1(bmiValue)}
                </AppText>
                <Tag label={bmiBand(bmiValue)} tone={bmiBand(bmiValue) === 'Normal' ? 'success' : 'neutral'} />
              </View>
            </View>
          ) : null}
        </View>
        <AppText variant="small" color="textFaint">
          Hedefler branşına, hedeflerine ve kilona göre hesaplandı; dilediğin zaman profilinden güncelleyebilirsin.
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  lead: { marginTop: spacing.sm },
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.petrol,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: spacing.xl,
    width: 36,
    height: 3,
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: spacing.xxs },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatarText: { fontFamily: fonts.display, fontSize: 26, color: colors.gold, letterSpacing: 1 },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sportIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metrics: {
    flexDirection: 'row',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  metric: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  targets: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  targetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  target: { flexGrow: 1, flexBasis: 90, gap: spacing.xxs },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
