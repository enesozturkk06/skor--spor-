import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInUp, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, fonts } from '@/theme';
import { easing } from '@/theme/motion';

import { AppText } from './AppText';
import { useSvgId } from './useSvgId';

/**
 * The SKOR SPOR monogram assembling itself: the petrol tile settles in, then
 * the three "score lines" rise one after another (white, orange, gold) — the
 * brand's momentum motif — and the wordmark follows.
 *
 * Each layer is its own SVG in the same 48×48 box so it can be animated with
 * Reanimated *preset* entering animations (safe on web, Reduce Motion aware).
 */
const RM = ReduceMotion.System;
const BAR_START = 220;
const BAR_STEP = 140;

function Layer({ children, size }: { children: ReactNode; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );
}

export function AnimatedLogoMark({ size = 72, delay = 0 }: { size?: number; delay?: number }) {
  const svgId = useSvgId('amark');
  const bar = (i: number) => FadeInUp.duration(420).delay(delay + BAR_START + i * BAR_STEP).easing(easing.out).reduceMotion(RM);

  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="SKOR SPOR">
      <Animated.View entering={ZoomIn.duration(380).delay(delay).reduceMotion(RM)} style={StyleSheet.absoluteFill}>
        <Layer size={size}>
          <Defs>
            <LinearGradient id={svgId('tile')} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.petrolBright} />
              <Stop offset="1" stopColor={colors.petrolDeep} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="48" height="48" rx="13" fill={`url(#${svgId('tile')})`} />
          <Rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" fill="none" stroke={colors.gold} strokeOpacity={0.35} strokeWidth={1.5} />
        </Layer>
      </Animated.View>
      <Animated.View entering={bar(0)} style={StyleSheet.absoluteFill}>
        <Layer size={size}>
          <Path d="M11 37 L13 30 L19 30 L17 37 Z" fill={colors.text} fillOpacity={0.9} />
        </Layer>
      </Animated.View>
      <Animated.View entering={bar(1)} style={StyleSheet.absoluteFill}>
        <Layer size={size}>
          <Defs>
            <LinearGradient id={svgId('orange')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.orange} />
              <Stop offset="1" stopColor={colors.orangeDeep} />
            </LinearGradient>
          </Defs>
          <Path d="M17 37 L25 11 L32 11 L24 37 Z" fill={`url(#${svgId('orange')})`} />
        </Layer>
      </Animated.View>
      <Animated.View entering={bar(2)} style={StyleSheet.absoluteFill}>
        <Layer size={size}>
          <Path d="M27 37 L31 24 L37 24 L33 37 Z" fill={colors.gold} />
        </Layer>
      </Animated.View>
    </View>
  );
}

/** Animated mark + wordmark ("SKOR" then gold "SPOR"). */
export function AnimatedLogo({ markSize = 72, textSize = 44, delay = 0 }: { markSize?: number; textSize?: number; delay?: number }) {
  const wordDelay = delay + BAR_START + 2 * BAR_STEP + 120;
  const word = (i: number) => FadeInLeft.duration(420).delay(wordDelay + i * 110).easing(easing.out).reduceMotion(RM);
  const lh = textSize * 1.02;
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="SKOR SPOR" testID="animated-logo">
      <AnimatedLogoMark size={markSize} delay={delay} />
      <View style={styles.word}>
        <Animated.View entering={word(0)}>
          <AppText style={[styles.wordText, { fontSize: textSize, lineHeight: lh }]}>SKOR</AppText>
        </Animated.View>
        <Animated.View entering={word(1)}>
          <AppText style={[styles.wordText, { fontSize: textSize, lineHeight: lh, color: colors.gold }]}>SPOR</AppText>
        </Animated.View>
      </View>
    </View>
  );
}

/** Time until the full logo animation has finished (for choreographing what follows). */
export const LOGO_ANIMATION_MS = BAR_START + 2 * BAR_STEP + 120 + 110 + 420;

/** Subtle fade for elements that should wait for the logo. */
export const afterLogo = (extra = 0) => FadeIn.duration(420).delay(LOGO_ANIMATION_MS + extra).reduceMotion(RM);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { flexDirection: 'row', gap: 8 },
  wordText: { fontFamily: fonts.displayItalic, color: colors.text, letterSpacing: 1 },
});
