import { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { duration, easing, stagger } from '@/theme/motion';

/**
 * Standard entrance for content blocks: a short rise + fade, staggered by
 * position. Use as `<Animated.View entering={enter(i)} />`.
 * Respects Reduce Motion (appears immediately).
 */
export function enter(index = 0, { distance = 14, step = stagger, ms = duration.base as number, delay = 0 } = {}) {
  return FadeInDown.withInitialValues({ transform: [{ translateY: distance }] })
    .duration(ms)
    .delay(delay + index * step)
    .easing(easing.out)
    .reduceMotion(ReduceMotion.System);
}

/** Fade only (for elements that must not move, e.g. overlays). */
export function fadeIn(index = 0, step = stagger) {
  return FadeIn.duration(duration.base).delay(index * step).reduceMotion(ReduceMotion.System);
}
