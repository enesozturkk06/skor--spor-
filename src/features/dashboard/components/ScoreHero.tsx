import { StyleSheet, View } from 'react-native';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { AppText, Card, Icon, ProgressBar, ProgressRing, Tag } from '@/components/ui';
import { colors, gradients, spacing } from '@/theme';

import { scoreTier, type TrainingScore } from '../athlete-score';

/** Choreography: score and ring start together, the pillars follow one by one. */
const SCORE_DELAY = 120;
const PILLAR_DELAY = 320;

/**
 * Athlete Score. Before the calibration threshold no number is shown at all
 * (progress towards it instead). Recovery and nutrition are labelled "Yakında"
 * — they are not part of the score until their modules exist.
 */
export function ScoreHero({ score }: { score: TrainingScore }) {
  if (score.status === 'loading') {
    // History arrives page by page; no number until the whole score window is here.
    return (
      <Card variant="hero" accent="gold" style={styles.card}>
        <View style={styles.headline} testID="score-loading" accessibilityLiveRegion="polite">
          <AppText variant="overline" color="gold">
            Athlete Score
          </AppText>
          <AppText variant="h2">Hesaplanıyor</AppText>
          <AppText variant="small" color="textMuted">
            Son 5 haftanın antrenmanları yükleniyor. Skor, bu aralıktaki tüm kayıtların tamamı gelince gösterilir.
          </AppText>
        </View>
        <Pillars training={null} />
      </Card>
    );
  }
  if (score.status === 'calibrating') {
    return (
      <Card variant="hero" accent="gold" style={styles.card}>
        <View style={styles.top} testID="score-calibrating">
          <View style={styles.headline}>
            <AppText variant="overline" color="gold">
              Athlete Score
            </AppText>
            <AppText variant="h2">Kalibre ediliyor</AppText>
            <AppText variant="small" color="textMuted">
              Skorun {score.needed} antrenmandan sonra hesaplanır. Az veriyle verilen bir skor yanıltıcı olur.
            </AppText>
          </View>
          <ProgressRing
            progress={score.workouts / score.needed}
            size={112}
            stroke={10}
            color={gradients.score}
            trackColor="rgba(255,255,255,0.08)"
            animated
            delay={SCORE_DELAY}
            testID="score-ring"
            accessibilityLabel={`Kalibrasyon: ${score.workouts} / ${score.needed} antrenman`}
          >
            <AppText variant="statM" testID="calibration-count">
              {score.workouts}/{score.needed}
            </AppText>
            <AppText variant="overline" color="textMuted" style={styles.ringLabel}>
              antrenman
            </AppText>
          </ProgressRing>
        </View>
        <Pillars training={null} />
      </Card>
    );
  }

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
            {score.delta !== null ? (
              <View style={styles.delta} testID="score-delta">
                <Icon name={score.delta >= 0 ? 'trending-up' : 'trending-down'} size={16} color={score.delta >= 0 ? 'success' : 'danger'} />
                <AppText variant="smallStrong" color={score.delta >= 0 ? 'success' : 'danger'}>
                  {score.delta >= 0 ? '+' : ''}
                  {score.delta} son 7 günde
                </AppText>
              </View>
            ) : null}
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
          <Icon name="lightning-bolt-outline" size={30} color="gold" />
        </ProgressRing>
      </View>
      <Pillars training={score.total} />
    </Card>
  );
}

function Pillars({ training }: { training: number | null }) {
  return (
    <View style={styles.pillars}>
      <View style={styles.pillar}>
        <View style={styles.pillarHead}>
          <AppText variant="small" color="textMuted">
            Antrenman
          </AppText>
          {training !== null ? <AnimatedNumber value={training} delay={PILLAR_DELAY} variant="smallStrong" /> : <AppText variant="smallStrong">—</AppText>}
        </View>
        <ProgressBar progress={(training ?? 0) / 100} color={colors.dataTraining} height={5} animated delay={PILLAR_DELAY} accessibilityLabel={`Antrenman ${training ?? 0} puan`} />
      </View>
      {(['Toparlanma', 'Beslenme'] as const).map((label) => (
        <View key={label} style={styles.pillar} accessible accessibilityLabel={`${label}: yakında, skora dahil değil`}>
          <AppText variant="small" color="textFaint" numberOfLines={1}>
            {label}
          </AppText>
          <View style={styles.soonTrack} />
          <AppText variant="overline" color="textFaint" style={styles.soon}>
            Yakında
          </AppText>
        </View>
      ))}
    </View>
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
  ringLabel: { fontSize: 9 },
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
  soon: { fontSize: 9, letterSpacing: 1 },
  soonTrack: { height: 5, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.14)' },
});
