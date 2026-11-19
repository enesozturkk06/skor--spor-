import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useSvgId } from '@/components/ui/useSvgId';
import { spacing } from '@/theme';

import { BAR_COLORS, barHeight, barScaleMax } from './bar-scale';
import { describeBars, NOT_ENOUGH_DATA } from './describe';
import { useWidth } from './useWidth';

export type Bar = { label: string; value: number; /** Emphasised bar (e.g. today). */ highlight?: boolean };

type Props = {
  data: readonly Bar[];
  /** What is measured — part of the screen-reader summary ("Bu hafta antrenman dakikası"). */
  label: string;
  unit?: string;
  /** Dashed target line. */
  goal?: number;
  height?: number;
  testID?: string;
};

/** Vertical bars with optional goal line. Labels are real text (fonts, wrapping), the bars SVG. */
export function BarChart({ data, label, unit, goal, height = 140, testID }: Props) {
  const [width, onLayout] = useWidth();
  const svgId = useSvgId('bars');
  const max = barScaleMax(data.map((d) => d.value), goal);
  const MAX_BAR = 40;
  const fitted = data.length ? Math.max(4, (width - (data.length > 10 ? 4 : 8) * (data.length - 1)) / data.length) : 0;
  const barW = Math.min(MAX_BAR, fitted);
  // Wide screens: bars keep their width and the spacing grows instead (no slabs).
  const gap = data.length > 1 ? (width - barW * data.length) / (data.length - 1) : 0;
  const y = (v: number) => height - barHeight(v, max, height - 6);

  return (
    <View role="img" aria-label={describeBars(label, data, unit, goal)} testID={testID}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && data.length ? (
          <Svg width={width} height={height} aria-hidden>
            <Defs>
              <LinearGradient id={svgId('hi')} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={BAR_COLORS.highlight[0]} />
                <Stop offset="1" stopColor={BAR_COLORS.highlight[1]} />
              </LinearGradient>
            </Defs>
            {data.map((d, i) => {
              const x = i * (barW + gap);
              const top = Math.min(y(d.value), height - 3);
              return (
                <Rect
                  key={i}
                  x={x}
                  y={top}
                  width={barW}
                  height={height - top}
                  rx={Math.min(6, barW / 2)}
                  fill={d.highlight ? `url(#${svgId('hi')})` : d.value > 0 ? BAR_COLORS.filled : BAR_COLORS.empty}
                />
              );
            })}
            {goal !== undefined ? (
              <Path d={`M0 ${y(goal).toFixed(1)} H${width}`} stroke={BAR_COLORS.goal} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.8} />
            ) : null}
          </Svg>
        ) : null}
        {!data.length ? (
          <AppText variant="small" color="textFaint" style={styles.empty}>
            {NOT_ENOUGH_DATA}
          </AppText>
        ) : null}
      </View>
      {data.length ? (
        <View style={styles.labels} aria-hidden>
          {data.map((d, i) => (
            <AppText key={i} variant="small" color={d.highlight ? 'orange' : 'textFaint'} numberOfLines={1} style={[styles.label, { width: barW, marginLeft: i ? gap : 0 }]}>
              {d.label}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: spacing.xs },
  label: { textAlign: 'center', fontSize: 11 },
  empty: { position: 'absolute', alignSelf: 'center', top: '45%' },
});
