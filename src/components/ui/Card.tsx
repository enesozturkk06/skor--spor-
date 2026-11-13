import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, spacing } from '@/theme';

type CardProps = {
  children: ReactNode;
  variant?: 'surface' | 'hero' | 'outline';
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
  accent = 'none',
  padded = true,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const body = (
    <>
      {variant === 'hero' ? (
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {accent !== 'none' ? (
        <View style={[styles.accent, { backgroundColor: accent === 'orange' ? colors.orange : colors.gold }]} />
      ) : null}
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </>
  );

  const baseStyle = [styles.base, variant === 'outline' ? styles.outline : styles.surface, style];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...baseStyle, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={baseStyle}>{body}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  surface: { backgroundColor: colors.surface },
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
  pressed: { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.99 }] },
});
