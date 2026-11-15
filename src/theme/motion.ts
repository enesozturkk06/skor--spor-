import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * SKOR SPOR motion tokens. Every animation takes its timing from here so the
 * app moves with one consistent, athletic character: fast starts, controlled
 * landings, no bouncy toy feel.
 *
 * All configs respect the OS "Reduce Motion" setting (ReduceMotion.System):
 * when it is on, animations jump straight to their final state.
 */

export const duration = {
  /** Press feedback, toggles. */
  instant: 120,
  fast: 200,
  base: 320,
  /** Hero numbers, rings, charts. */
  slow: 650,
  cinematic: 900,
} as const;

/** Delay between items of a list entering one after another. */
export const stagger = 55;

export const easing = {
  /** Default for entrances: decisive start, soft landing. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** Exits leave quickly. */
  in: Easing.bezier(0.55, 0, 1, 0.45),
} as const;

export const timing = {
  fast: { duration: duration.fast, easing: easing.out, reduceMotion: ReduceMotion.System },
  base: { duration: duration.base, easing: easing.out, reduceMotion: ReduceMotion.System },
  slow: { duration: duration.slow, easing: easing.out, reduceMotion: ReduceMotion.System },
  cinematic: { duration: duration.cinematic, easing: easing.out, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithTimingConfig>;

export const spring = {
  /** Press-in / press-out of buttons and cards: crisp, no wobble. */
  press: { mass: 0.6, stiffness: 420, damping: 28, reduceMotion: ReduceMotion.System },
  /** Selections (tiles, chips): a short confident settle. */
  select: { mass: 0.8, stiffness: 300, damping: 20, reduceMotion: ReduceMotion.System },
  /** Larger elements (cards, sheets). */
  gentle: { mass: 1, stiffness: 180, damping: 22, reduceMotion: ReduceMotion.System },
} satisfies Record<string, WithSpringConfig>;

/** How far pressables shrink while held. */
export const pressScale = { button: 0.97, card: 0.985, tile: 0.96 } as const;
