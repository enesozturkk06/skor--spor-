import { type StyleProp, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { sportFamilies, type SportFamily } from '@/theme';

type Props = {
  family: SportFamily;
  width?: number;
  height?: number;
  /** 0–1; motifs are background texture, keep them quiet. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The line motif of a sport family, drawn behind content (e.g. the corner of
 * a card). Same stroke family as the icons; decorative, hidden from a11y.
 * strike = combat · plates = strength · flow = endurance · field = team · court = racket
 */
export function SportMotif({ family, width = 160, height = 100, opacity = 0.35, style }: Props) {
  const { accentLight, motif } = sportFamilies[family];
  const s = { stroke: accentLight, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const };
  return (
    <View pointerEvents="none" style={[{ width, height, opacity }, style]} aria-hidden importantForAccessibility="no-hide-descendants" testID={`motif-${family}`}>
      <Svg width={width} height={height} viewBox="0 0 160 100" preserveAspectRatio="xMaxYMin slice">
        {motif === 'strike' ? (
          <>
            <Path d="M96 -6 L64 106" {...s} />
            <Path d="M122 -6 L90 106" {...s} strokeWidth={5} />
            <Path d="M146 -6 L114 106" {...s} />
          </>
        ) : motif === 'plates' ? (
          <>
            <Circle cx={140} cy={18} r={22} {...s} />
            <Circle cx={140} cy={18} r={38} {...s} />
            <Circle cx={140} cy={18} r={56} {...s} strokeDasharray="2 7" />
          </>
        ) : motif === 'flow' ? (
          <>
            <Path d="M40 30 C70 10 90 50 120 30 S170 10 190 30" {...s} />
            <Path d="M30 52 C60 32 80 72 110 52 S160 32 180 52" {...s} />
            <Path d="M20 74 C50 54 70 94 100 74 S150 54 170 74" {...s} />
          </>
        ) : motif === 'field' ? (
          <>
            <Rect x={58} y={8} width={96} height={84} rx={4} {...s} />
            <Path d="M106 8 V92" {...s} />
            <Circle cx={106} cy={50} r={14} {...s} />
          </>
        ) : (
          <>
            <Rect x={58} y={8} width={96} height={84} rx={2} {...s} />
            <Path d="M58 30 H154 M58 70 H154 M106 30 V70" {...s} />
          </>
        )}
      </Svg>
    </View>
  );
}
