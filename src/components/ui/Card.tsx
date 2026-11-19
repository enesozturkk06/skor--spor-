import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { pressScale } from '@/theme/motion';
import { colors, elevation, glows, gradients, radius, spacing, surfaces, type GlowTone } from '@/theme';

type CardProps = {
  children: ReactNode;
  /**
   * Surface level (see `surfaces` in theme/tokens.ts):
   * - surface: base content · raised: stands out from the base layer
   * - featured: the one focal card of a screen (gradient, shadow, optional glow)
   * - hero: petrol gradient without depth (existing cards) · outline: transparent
   */
  variant?: 'surface' | 'raised' | 'featured' | 'hero' | 'outline';
  /** Controlled light on the card (featured cards only; ignored elsewhere). */
  glow?: GlowTone;
  /** Short colored line on the top edge — the SKOR "score line" motif. */
  accent?: 'orange' | 'gold' | 'none';
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  variant = 'surface',
  glow,
  accent = 'none',
  padded = true,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const gradient = variant === 'hero' || variant === 'featured';
  const body = (
    <>
      {gradient ? (
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {variant === 'featured' && glow ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: glows[glow] }]} />
      ) : null}
      {accent !== 'none' ? (
        <View style={[styles.accent, { backgroundColor: accent === 'orange' ? colors.orange : colors.gold }]} />
      ) : null}
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </>
  );

  const level = variant === 'raised' ? styles.raised : variant === 'featured' ? styles.featured : variant === 'outline' ? styles.outline : styles.surface;
  const baseStyle = [styles.base, level, style];

  if (onPress) {
    return (
      <PressableScale
        scaleTo={pressScale.card}
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...baseStyle, pressed && styles.pressed]}
      >
        {body}
      </PressableScale>
    );
  }
  return <View style={baseStyle}>{body}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  surface: surfaces.base,
  raised: { ...surfaces.raised, boxShadow: elevation.raised },
  featured: { ...surfaces.featured, boxShadow: elevation.featured },
  outline: { backgroundColor: colors.transparent, borderColor: colors.borderStrong },
  content: { flexGrow: 1 },
  padded: { padding: spacing.lg },
  accent: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 1,
  },
  pressed: { backgroundColor: colors.surfacePressed },
});
