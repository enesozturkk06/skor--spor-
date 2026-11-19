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
 *
 * Style and meaning rules live in ./icon-system.ts (outline glyphs; filled only
 * for the active tab; one glyph per meaning) and are checked by
 * e2e/unit/icon-system.spec.ts. Sports use SKOR SPOR's own SVG set
 * (./sport-glyphs.ts), not this font.
 */
// prettier-ignore
export const ICON_NAMES = [
  'account-circle', 'account-circle-outline', 'account-group-outline', 'account-outline',
  'alert-circle-outline', 'alert-outline', 'arm-flex-outline', 'arrow-left', 'arrow-right',
  'battery-charging-high', 'bookshelf', 'boxing-glove', 'brain',
  'cake-variant-outline', 'calendar-check-outline', 'calendar-week-outline', 'chart-line', 'check', 'chevron-down', 'chevron-right', 'chevron-up', 'clipboard-list-outline',
  'clock-alert-outline', 'close', 'close-circle-outline', 'cloud-alert-outline', 'cloud-off-outline', 'content-copy', 'delete-outline', 'drag',
  'dumbbell', 'email-check-outline', 'email-outline', 'email-sync-outline',
  'eye-off-outline', 'eye-outline', 'fire', 'flag-checkered', 'flask-outline',
  'food-apple', 'food-apple-outline', 'format-quote-open-outline',
  'heart-outline', 'human', 'heart-pulse', 'home-variant', 'home-variant-outline',
  'information-outline', 'lightning-bolt', 'lightning-bolt-outline',
  'link-variant-off', 'lock-outline', 'logout', 'lungs', 'magnify', 'map-marker-distance', 'meditation', 'minus',
  'medal-outline', 'pause', 'pencil-outline', 'play', 'plus', 'progress-wrench', 'refresh', 'repeat', 'rocket-launch-outline', 'ruler',
  'scale-bathroom', 'shield-check-outline', 'sleep', 'speedometer',
  'tape-measure', 'target', 'timer-outline', 'trending-down', 'trending-up', 'trophy-outline',
  'weight-lifter', 'whistle-outline', 'yoga',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
