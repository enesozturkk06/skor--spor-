import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/**
 * Decorative ambient light behind screens: a petrol glow top-left and a
 * faint orange ember bottom-right. Purely visual; hidden from a11y.
 *
 * Drawn with native CSS radial gradients (React Native 0.88 `backgroundImage`,
 * plain CSS on web) instead of a full-screen SVG: no vector rasterisation or
 * extra nodes per screen. Percent sizes/positions are relative to the view,
 * matching the previous SVG (objectBoundingBox) exactly.
 */
const hex2rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
const BG = hex2rgb(colors.bg);

const GLOW = [
  `radial-gradient(ellipse 60% 60% at 100% 100%, rgba(${hex2rgb(colors.orange)},0.12), rgba(${BG},0))`,
  `radial-gradient(ellipse 75% 75% at 10% 0%, rgba(${hex2rgb(colors.petrolBright)},0.55), rgba(${BG},0))`,
].join(', ');

export function BackdropGlow() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.glow]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="backdrop-glow"
    />
  );
}

const styles = StyleSheet.create({
  glow: { backgroundImage: GLOW },
});
