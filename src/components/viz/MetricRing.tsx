import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { colors, gradients, spacing } from '@/theme';

type Props = {
  /** 0–1 share of the target. */
  progress: number;
  /** Text in the middle, already formatted ("42", "3/4"). */
  value: string;
  /** Under the value ("dk", "gün"). */
  unit?: string;
  /** Under the ring; also the start of the screen-reader label. */
  caption: string;
  size?: number;
  tone?: 'score' | 'orange' | 'gold' | 'petrol';
  /** Sweep in on first show (follows Reduce Motion). */
  animated?: boolean;
  testID?: string;
};

const TONES = { score: gradients.score, orange: colors.orange, gold: colors.gold, petrol: colors.petrolBright } as const;

/** A progress ring with its value and caption — for goals, levels and weekly targets. */
export function MetricRing({ progress, value, unit, caption, size = 112, tone = 'score', animated = false, testID }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const stroke = Math.max(6, Math.round(size / 11));
  return (
    <View style={styles.wrap} testID={testID}>
      <ProgressRing
        progress={progress}
        size={size}
        stroke={stroke}
        color={TONES[tone]}
        animated={animated}
        accessibilityLabel={`${caption}: ${value}${unit ? ` ${unit}` : ''}, hedefin %${pct}`}
      >
        <AppText variant={size >= 100 ? 'statL' : 'statM'} align="center">
          {value}
        </AppText>
        {unit ? (
          <AppText variant="overline" color="textMuted" align="center">
            {unit}
          </AppText>
        ) : null}
      </ProgressRing>
      <AppText variant="smallStrong" color="textMuted" align="center" style={{ maxWidth: size + 24 }} aria-hidden>
        {caption}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
});
