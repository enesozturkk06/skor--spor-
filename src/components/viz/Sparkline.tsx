import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useSvgId } from '@/components/ui/useSvgId';
import { colors, type ColorToken } from '@/theme';

import { describeSeries } from './describe';
import { useWidth } from './useWidth';

type Props = {
  values: readonly number[];
  /** What is measured — part of the screen-reader summary ("Haftalık dakika"). */
  label: string;
  unit?: string;
  height?: number;
  color?: ColorToken;
  testID?: string;
};

/** Small trend line for tiles. Fewer than 2 values: a flat dashed baseline (never invented points). */
export function Sparkline({ values, label, unit, height = 32, color = 'orange', testID }: Props) {
  const [width, onLayout] = useWidth();
  const svgId = useSvgId('spark');
  const stroke = colors[color];
  const pad = 3;
  const enough = values.length >= 2;

  let line = '';
  let area = '';
  let last: { x: number; y: number } | null = null;
  if (enough && width > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => ({
      x: pad + (i / (values.length - 1)) * (width - pad * 2),
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
    line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${height} L${pts[0].x.toFixed(1)} ${height} Z`;
    last = pts[pts.length - 1];
  }

  return (
    <View onLayout={onLayout} style={{ height }} role="img" aria-label={describeSeries(label, values, unit)} testID={testID}>
      {width > 0 ? (
        <Svg width={width} height={height} aria-hidden>
          {enough ? (
            <>
              <Defs>
                <LinearGradient id={svgId('fill')} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={area} fill={`url(#${svgId('fill')})`} />
              <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {last ? <Circle cx={last.x} cy={last.y} r={3} fill={stroke} /> : null}
            </>
          ) : (
            <Path d={`M${pad} ${height / 2} H${width - pad}`} stroke={colors.textFaint} strokeWidth={1.5} strokeDasharray="3 4" />
          )}
        </Svg>
      ) : null}
    </View>
  );
}
