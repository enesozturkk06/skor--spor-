import { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { duration, easing, stagger } from '@/theme/motion';

/**
 * Standard entrance for content blocks: a short rise + fade, staggered by
 * position. Use as `<Animated.View entering={enter(i)} />`.
 * Respects Reduce Motion (appears immediately).
 *
 * Only Reanimated *preset* animations are used here, never `.withInitialValues()`
 * or custom Keyframes: on web, Reanimated turns custom entering animations
 * `position: absolute` when they finish, which pulls blocks out of the layout
 * (see e2e/layout-stability.spec.ts). The preset rise distance is fixed (~25 px).
 */
export function enter(index = 0, { step = stagger, ms = duration.base as number, delay = 0 } = {}) {
  return FadeInDown.duration(ms)
    .delay(delay + index * step)
    .easing(easing.out)
    .reduceMotion(ReduceMotion.System);
}

/** Fade only (for elements that must not move, e.g. overlays). */
export function fadeIn(index = 0, step = stagger) {
  return FadeIn.duration(duration.base).delay(index * step).reduceMotion(ReduceMotion.System);
}
