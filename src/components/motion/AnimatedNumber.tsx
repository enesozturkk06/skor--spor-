import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText, type AppTextProps } from '@/components/ui/AppText';
import { duration as motionDuration } from '@/theme/motion';

import { countUpValue } from './count-up';

type Options = { duration?: number; decimals?: number; delay?: number };

/**
 * Counts from the previously shown value to `target`.
 * A requestAnimationFrame loop is used on purpose: it is a handful of frames
 * for one number, works identically on web and native, and stops itself.
 * Under Reduce Motion the target is shown immediately.
 */
export function useCountUp(target: number, { duration = motionDuration.slow, decimals = 0, delay = 0 }: Options = {}): number {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;
    const from = shownRef.current;
    if (from === target) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + delay;
      const next = countUpValue(from, target, Math.max(0, now - start), duration, decimals);
      shownRef.current = next;
      setShown(next);
      if (next !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, decimals, delay, reduceMotion]);

  return reduceMotion ? target : shown;
}

type AnimatedNumberProps = Omit<AppTextProps, 'children'> &
  Options & {
    value: number;
    format?: (n: number) => string;
  };

/** Text that counts up to `value`. Screen readers get the final value only. */
export function AnimatedNumber({ value, format = (n) => String(n), duration, decimals, delay, ...text }: AnimatedNumberProps) {
  const shown = useCountUp(value, { duration, decimals, delay });
  return (
    <AppText {...text} accessibilityLabel={text.accessibilityLabel ?? format(value)}>
      {format(shown)}
    </AppText>
  );
}
