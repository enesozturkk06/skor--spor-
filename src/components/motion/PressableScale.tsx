import { useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics, type HapticKind } from '@/lib/haptics';
import { pressScale, spring } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Static style, or a function of the pressed state (like Pressable). */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Scale while held (1 = none). */
  scaleTo?: number;
  /** Tactile feedback on press (native only). */
  haptic?: HapticKind;
};

/**
 * Pressable with a spring "press-in" that runs on the UI thread.
 * Keeps every Pressable/accessibility prop; under Reduce Motion the
 * scale is skipped and only the style-level pressed feedback remains.
 */
export function PressableScale({
  children,
  style,
  scaleTo = pressScale.button,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const target = reduceMotion || disabled ? 1 : scaleTo;
  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        scale.set(withSpring(target, spring.press));
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        scale.set(withSpring(1, spring.press));
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[resolved, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
