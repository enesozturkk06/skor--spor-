import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Decorative ambient light behind screens: a petrol glow top-left and a
 * faint orange ember bottom-right. Purely visual; hidden from a11y.
 */
export function BackdropGlow({ intensity = 1 }: { intensity?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glowPetrol" cx="10%" cy="0%" r="75%">
            <Stop offset="0" stopColor={colors.petrolBright} stopOpacity={0.55 * intensity} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowEmber" cx="100%" cy="100%" r="60%">
            <Stop offset="0" stopColor={colors.orange} stopOpacity={0.12 * intensity} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowPetrol)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowEmber)" />
      </Svg>
    </View>
  );
}
