/**
 * Every icon the app uses (MaterialCommunityIcons names).
 *
 * The app ships a subset icon font containing only these glyphs instead of
 * the full 1.3 MB font (and the other ~20 icon sets the package bundles).
 *
 * To add an icon:
 *   1. add its MaterialCommunityIcons name below (TypeScript rejects unregistered names)
 *   2. run `npm run fonts:build`
 * e2e/unit/fonts.spec.ts fails if the generated font is out of date.
 */
// prettier-ignore
export const ICON_NAMES = [
  'account-circle', 'account-circle-outline', 'account-group', 'account-outline',
  'alert-circle-outline', 'arm-flex', 'arrow-left', 'arrow-right',
  'basketball', 'bookshelf', 'boxing-glove', 'brain',
  'cake-variant-outline', 'calendar-check', 'chart-line', 'check', 'chevron-right',
  'clock-alert-outline', 'close', 'cloud-alert-outline', 'cloud-off-outline',
  'dumbbell', 'email-check-outline', 'email-outline', 'email-sync-outline',
  'eye-off-outline', 'eye-outline', 'fire', 'flask-outline',
  'food-apple', 'food-apple-outline', 'format-quote-open',
  'heart-outline', 'heart-pulse', 'home-variant', 'home-variant-outline',
  'information-outline', 'karate', 'lightning-bolt', 'lightning-bolt-outline',
  'link-variant-off', 'lock-outline', 'logout', 'meditation', 'minus', 'mixed-martial-arts',
  'pencil-outline', 'plus', 'progress-wrench', 'refresh', 'ruler', 'run',
  'scale-bathroom', 'shield-check-outline', 'sleep', 'soccer', 'speedometer', 'swim',
  'target', 'tennis', 'timer-outline', 'trending-down', 'trending-up', 'trophy-outline',
  'volleyball', 'weight-lifter', 'yoga',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
