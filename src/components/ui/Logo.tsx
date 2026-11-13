import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, fonts } from '@/theme';

import { AppText } from './AppText';
import { useSvgId } from './useSvgId';

/**
 * SKOR SPOR monogram: two forward-leaning "score lines" (momentum)
 * inside a petrol tile. Orange = effort, gold = achievement.
 */
export function LogoMark({ size = 48 }: { size?: number }) {
  const svgId = useSvgId('mark');
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="SKOR SPOR">
      <Defs>
        <LinearGradient id={svgId('markTile')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.petrolBright} />
          <Stop offset="1" stopColor={colors.petrolDeep} />
        </LinearGradient>
        <LinearGradient id={svgId('markOrange')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.orange} />
          <Stop offset="1" stopColor={colors.orangeDeep} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="48" height="48" rx="13" fill={`url(#${svgId('markTile')})`} />
      <Rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" fill="none" stroke={colors.gold} strokeOpacity={0.35} strokeWidth={1.5} />
      <Path d="M17 37 L25 11 L32 11 L24 37 Z" fill={`url(#${svgId('markOrange')})`} />
      <Path d="M27 37 L31 24 L37 24 L33 37 Z" fill={colors.gold} />
      <Path d="M11 37 L13 30 L19 30 L17 37 Z" fill={colors.text} fillOpacity={0.9} />
    </Svg>
  );
}

type LogoProps = { size?: 'sm' | 'md' | 'lg'; showMark?: boolean };

const SIZES = { sm: { mark: 30, text: 22 }, md: { mark: 40, text: 30 }, lg: { mark: 72, text: 52 } } as const;

export function Logo({ size = 'md', showMark = true }: LogoProps) {
  const s = SIZES[size];
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="SKOR SPOR">
      {showMark ? <LogoMark size={s.mark} /> : null}
      <View style={styles.word}>
        <AppText style={[styles.wordText, { fontSize: s.text, lineHeight: s.text * 1.02 }]}>SKOR</AppText>
        <AppText style={[styles.wordText, { fontSize: s.text, lineHeight: s.text * 1.02, color: colors.gold }]}>SPOR</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { flexDirection: 'row', gap: 6 },
  wordText: { fontFamily: fonts.displayItalic, color: colors.text, letterSpacing: 1 },
});
