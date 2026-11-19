import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useSvgId } from '@/components/ui/useSvgId';
import { badgeTiers, colors, radius, spacing, type BadgeTier } from '@/theme';

import { formatNumber } from './describe';

type Props = {
  label: string;
  tier: BadgeTier;
  icon: IconName;
  /** Only ever true when the athlete's own data meets the rule (features/training/achievements.ts). */
  earned: boolean;
  /** Real progress toward an unearned badge. */
  progress?: { current: number; target: number };
  size?: number;
  testID?: string;
};

/** Achievement medallion. Unearned badges stay muted with their real progress — never shown as won. */
export function Badge({ label, tier, icon, earned, progress, size = 72, testID }: Props) {
  const svgId = useSvgId('badge');
  const t = badgeTiers[tier];
  const r = size / 2;
  // An unearned badge can never look complete (progress stops one short of the target).
  const done = progress ? Math.min(progress.current, earned ? progress.target : Math.max(0, progress.target - 1)) : 0;
  const summary = earned
    ? `Rozet: ${label}, ${t.label}, kazanıldı.`
    : `Rozet: ${label}, ${t.label}, henüz kazanılmadı${progress ? `, ilerleme ${formatNumber(done)} / ${formatNumber(progress.target)}` : ''}.`;

  return (
    <View style={[styles.wrap, { width: size + 32 }]} role="img" aria-label={summary} testID={testID}>
      <View style={{ width: size, height: size }} aria-hidden>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={svgId('ring')} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={t.ringLight} />
              <Stop offset="1" stopColor={t.ring} />
            </LinearGradient>
          </Defs>
          {earned ? (
            <>
              <Circle cx={r} cy={r} r={r - 1} fill={`url(#${svgId('ring')})`} />
              <Circle cx={r} cy={r} r={r - size * 0.1} fill={t.face} />
              <Circle cx={r} cy={r} r={r - size * 0.15} fill="none" stroke={t.ringLight} strokeOpacity={0.35} strokeWidth={1} />
            </>
          ) : (
            <>
              <Circle cx={r} cy={r} r={r - 2} fill={colors.surface} stroke={colors.textFaint} strokeWidth={1.5} strokeDasharray="3 4" />
              <Circle cx={r} cy={r} r={r - size * 0.15} fill="none" stroke={colors.divider} strokeWidth={1} />
            </>
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon name={icon} size={Math.round(size * 0.38)} color={earned ? 'gold' : 'textFaint'} />
        </View>
      </View>
      <View aria-hidden style={styles.text}>
        <AppText variant="smallStrong" color={earned ? 'text' : 'textMuted'} align="center" numberOfLines={2}>
          {label}
        </AppText>
        {earned ? (
          <AppText variant="overline" align="center" style={{ color: t.ringLight }}>
            {t.label}
          </AppText>
        ) : progress ? (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((done / progress.target) * 100)}%` }]} />
            </View>
            <AppText variant="small" color="textFaint" align="center">
              {formatNumber(done)} / {formatNumber(progress.target)}
            </AppText>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center' },
  text: { alignItems: 'center', gap: spacing.xs, alignSelf: 'stretch' },
  track: { height: 4, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: colors.dataTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.goldDeep },
});
