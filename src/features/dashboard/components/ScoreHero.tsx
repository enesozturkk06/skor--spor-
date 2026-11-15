import { StyleSheet, View } from 'react-native';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AppText, Card, Icon, ProgressBar, ProgressRing, Tag } from '@/components/ui';
import { colors, gradients, spacing } from '@/theme';

import { SCORE_WEIGHTS, scoreTier, type ScoreBreakdown } from '../athlete-score';

type Props = { score: ScoreBreakdown; delta: number };

const PILLARS = [
  { key: 'training', label: 'Antrenman', color: colors.dataTraining, weight: SCORE_WEIGHTS.training },
  { key: 'recovery', label: 'Toparlanma', color: colors.dataRecovery, weight: SCORE_WEIGHTS.recovery },
  { key: 'nutrition', label: 'Beslenme', color: colors.dataNutrition, weight: SCORE_WEIGHTS.nutrition },
] as const;

/** Choreography: score and ring start together, the pillars follow one by one. */
const SCORE_DELAY = 120;
const PILLAR_DELAY = 320;
const PILLAR_STEP = 90;

export function ScoreHero({ score, delta }: Props) {
  const tier = scoreTier(score.total);
  return (
    <Card variant="hero" accent="gold" style={styles.card}>
      <View style={styles.top}>
        <View style={styles.headline}>
          <AppText variant="overline" color="gold">
            Athlete Score
          </AppText>
          <View style={styles.scoreRow} accessible accessibilityLabel={`Athlete Score ${score.total} / 100`}>
            <AnimatedNumber value={score.total} delay={SCORE_DELAY} variant="statXL" testID="athlete-score" />
            <AppText variant="statM" color="textMuted" style={styles.outOf}>
              /100
            </AppText>
          </View>
          <View style={styles.meta}>
            <Tag label={tier.label} tone={tier.tone} />
            <View style={styles.delta}>
              <Icon name={delta >= 0 ? 'trending-up' : 'trending-down'} size={16} color={delta >= 0 ? 'success' : 'danger'} />
              <AppText variant="smallStrong" color={delta >= 0 ? 'success' : 'danger'}>
                {delta >= 0 ? '+' : ''}
                {delta} bu hafta
              </AppText>
            </View>
          </View>
        </View>
        <ProgressRing
          progress={score.total / 100}
          size={124}
          stroke={11}
          color={gradients.score}
          trackColor="rgba(255,255,255,0.08)"
          animated
          delay={SCORE_DELAY}
          testID="score-ring"
        >
          <Icon name="lightning-bolt" size={30} color="gold" />
        </ProgressRing>
      </View>

      <View style={styles.pillars}>
        {PILLARS.map((p, i) => (
          <View key={p.key} style={styles.pillar}>
            <View style={styles.pillarHead}>
              <AppText variant="small" color="textMuted">
                {p.label}
              </AppText>
              <AnimatedNumber value={score[p.key]} delay={PILLAR_DELAY + i * PILLAR_STEP} variant="smallStrong" />
            </View>
            <ProgressBar
              progress={score[p.key] / 100}
              color={p.color}
              height={5}
              animated
              delay={PILLAR_DELAY + i * PILLAR_STEP}
              accessibilityLabel={`${p.label} ${score[p.key]} puan`}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.borderStrong },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, paddingTop: spacing.xs },
  headline: { flexShrink: 1, gap: spacing.xs },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  outOf: { marginLeft: spacing.xs, marginBottom: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  delta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pillars: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  pillar: { flex: 1, gap: spacing.sm },
  pillarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.xs },
});
