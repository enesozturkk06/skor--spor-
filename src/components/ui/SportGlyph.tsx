import Svg, { Circle, Path } from 'react-native-svg';

import { SPORT_GLYPHS, type SportGlyphName } from './sport-glyphs';

type Props = { name: SportGlyphName; size: number; color: string };

/** Draws one of SKOR SPOR's own sport icons (decorative: the label next to it carries the meaning). */
export function SportGlyph({ name, size, color }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`glyph-${name}`}
    >
      {SPORT_GLYPHS[name].map((s, i) =>
        s.kind === 'path' ? (
          <Path key={i} d={s.d} transform={'transform' in s ? s.transform : undefined} />
        ) : (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
        ),
      )}
    </Svg>
  );
}
