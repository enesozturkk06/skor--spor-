import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, elevation, radius, spacing, surfaces, type ColorToken } from '@/theme';

import { formatNumber } from './describe';
import { Sparkline } from './Sparkline';

export type StatDelta = {
  /** Change against the comparison period (same unit as the value). */
  value: number;
  /** "geçen haftaya göre" */
  period: string;
  /** Whether a rise is good (minutes) or bad (rest-time). */
  goodWhen?: 'up' | 'down';
};

type Props = {
  label: string;
  /** Already formatted, or a number (formatted for tr-TR). */
  value: string | number;
  unit?: string;
  icon?: IconName;
  iconColor?: ColorToken;
  delta?: StatDelta;
  /** Small trend under the value (real values only; omit when unknown). */
  spark?: readonly number[];
  level?: 'base' | 'raised';
  testID?: string;
};

/** One number that matters: label, value, unit, optional change and trend. Read as one sentence by screen readers. */
export function StatTile({ label, value, unit, icon, iconColor = 'gold', delta, spark, level = 'base', testID }: Props) {
  const shown = typeof value === 'number' ? formatNumber(value) : value;
  const up = delta ? delta.value > 0 : false;
  const flat = delta ? delta.value === 0 : true;
  const good = delta && !flat ? (delta.goodWhen ?? 'up') === (up ? 'up' : 'down') : null;
  const deltaText = delta ? `${flat ? '±' : up ? '+' : '−'}${formatNumber(Math.abs(delta.value))}${unit ? ` ${unit}` : ''}` : '';
  const summary = `${label}: ${shown}${unit ? ` ${unit}` : ''}${delta ? `, ${delta.period} ${deltaText}` : ''}.`;

  return (
    <View style={[styles.tile, level === 'raised' ? styles.raised : styles.base]} accessible role="img" aria-label={summary} testID={testID}>
      <View style={styles.inner} aria-hidden importantForAccessibility="no-hide-descendants">
      <View style={styles.head}>
        <AppText variant="overline" color="textMuted" numberOfLines={1} style={styles.flex}>
          {label}
        </AppText>
        {icon ? (
          <View style={styles.iconWrap}>
            <Icon name={icon} size={16} color={iconColor} />
          </View>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <AppText variant="statM">{shown}</AppText>
        {unit ? (
          <AppText variant="small" color="textMuted">
            {unit}
          </AppText>
        ) : null}
      </View>
      {delta ? (
        <View style={[styles.delta, { backgroundColor: good === null ? colors.surfacePressed : good ? 'rgba(79,209,161,0.12)' : colors.dangerSoft }]}>
          <Icon name={flat ? 'minus' : up ? 'trending-up' : 'trending-down'} size={14} color={good === null ? 'textMuted' : good ? 'success' : 'danger'} />
          <AppText variant="small" color={good === null ? 'textMuted' : good ? 'success' : 'danger'}>
            {deltaText} · {delta.period}
          </AppText>
        </View>
      ) : null}
      {spark && spark.length >= 2 ? <Sparkline values={spark} label={label} unit={unit} height={28} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, minWidth: 140, flexGrow: 1, flexBasis: 140 },
  inner: { gap: spacing.sm },
  base: surfaces.base,
  raised: { ...surfaces.raised, boxShadow: elevation.raised },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  iconWrap: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldSoft },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  delta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
