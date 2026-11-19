import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useSvgId } from '@/components/ui/useSvgId';
import { colors, spacing, type ColorToken } from '@/theme';

import { describeTrend, formatNumber, NOT_ENOUGH_DATA } from './describe';
import { useWidth } from './useWidth';

export type TrendPoint = { label: string; value: number };

type Props = {
  points: readonly TrendPoint[];
  /** What is measured — part of the screen-reader summary ("Tahmini 1RM · Bench press"). */
  label: string;
  unit?: string;
  height?: number;
  color?: ColorToken;
  testID?: string;
};

/** Progress over time: line + soft area, the best point marked, first/last labels underneath. */
export function TrendLine({ points, label, unit, height = 150, color = 'orange', testID }: Props) {
  const [width, onLayout] = useWidth();
  const svgId = useSvgId('trend');
  const stroke = colors[color];
  const enough = points.length >= 2;
  const padX = 6;
  const padTop = 14;
  const padBottom = 6;

  let line = '';
  let area = '';
  let best: { x: number; y: number } | null = null;
  const grid: number[] = [];
  if (enough && width > 0) {
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.max(1, max * 0.1);
    const lo = min - span * 0.15;
    const hi = max + span * 0.1;
    const xs = (i: number) => padX + (i / (points.length - 1)) * (width - padX * 2);
    const ys = (v: number) => padTop + (1 - (v - lo) / (hi - lo)) * (height - padTop - padBottom);
    line = points.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(p.value).toFixed(1)}`).join(' ');
    area = `${line} L${xs(points.length - 1).toFixed(1)} ${height} L${xs(0).toFixed(1)} ${height} Z`;
    const bi = values.indexOf(max);
    best = { x: xs(bi), y: ys(max) };
    for (const f of [0.25, 0.5, 0.75]) grid.push(padTop + f * (height - padTop - padBottom));
  }

  return (
    <View role="img" aria-label={describeTrend(label, points, unit)} testID={testID}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && enough ? (
          <Svg width={width} height={height} aria-hidden>
            <Defs>
              <LinearGradient id={svgId('area')} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity={0.24} />
                <Stop offset="1" stopColor={stroke} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {grid.map((gy) => (
              <Path key={gy} d={`M0 ${gy.toFixed(1)} H${width}`} stroke={colors.divider} strokeWidth={1} />
            ))}
            <Path d={area} fill={`url(#${svgId('area')})`} />
            <Path d={line} stroke={stroke} strokeWidth={2.25} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {best ? (
              <>
                <Circle cx={best.x} cy={best.y} r={7} fill={stroke} opacity={0.22} />
                <Circle cx={best.x} cy={best.y} r={3.5} fill={colors.text} stroke={stroke} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
        {!enough ? (
          <AppText variant="small" color="textFaint" style={styles.empty}>
            {NOT_ENOUGH_DATA}
          </AppText>
        ) : null}
      </View>
      {enough ? (
        <View style={styles.axis} aria-hidden>
          <AppText variant="small" color="textFaint">
            {points[0].label}
          </AppText>
          <AppText variant="smallStrong" color="text">
            {formatNumber(points[points.length - 1].value)}
            {unit ? ` ${unit}` : ''} · {points[points.length - 1].label}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  empty: { position: 'absolute', alignSelf: 'center', top: '45%' },
});
