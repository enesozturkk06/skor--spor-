import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Tactile feedback with a small, consistent vocabulary. Never throws:
 * web (and devices without a haptic engine) simply get no vibration.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function run(fn: () => Promise<void>) {
  if (!supported) return;
  fn().catch(() => {
    /* no haptic engine / disabled by the OS — silently ignore */
  });
}

export const haptics = {
  /** Button presses, tab switches. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Picking an option (sport, goal, chip). */
  select: () => run(() => Haptics.selectionAsync()),
  /** Completed action (profile saved, set finished). */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics;
