/**
 * SKOR SPOR design tokens.
 * Every color, spacing, radius and font used in the UI must come from here.
 */

/** Core brand palette — never change without brand approval. */
export const brand = {
  petrol: '#073C38',
  orange: '#FF7138',
  gold: '#D6B77A',
  ink: '#080D0D',
} as const;

export const colors = {
  // Backgrounds (ink → petrol ramp)
  bg: brand.ink,
  bgRaised: '#0B1413',
  surface: '#0F1B1A',
  surfaceAlt: '#132523',
  surfacePressed: '#182E2B',

  // Brand
  petrol: brand.petrol,
  petrolDeep: '#042926',
  petrolBright: '#0D5A52',
  orange: brand.orange,
  orangeDeep: '#E2551F',
  orangeSoft: 'rgba(255,113,56,0.14)',
  gold: brand.gold,
  goldDeep: '#B8965A',
  goldSoft: 'rgba(214,183,122,0.12)',

  // Text
  text: '#F4F1EA',
  textMuted: '#9DAAA7',
  textFaint: '#5F6F6C',
  textOnOrange: '#160904',

  // Lines
  border: 'rgba(214,183,122,0.10)',
  borderStrong: 'rgba(214,183,122,0.26)',
  divider: 'rgba(255,255,255,0.06)',

  // Feedback
  success: '#4FD1A1',
  warning: '#F2C14E',
  danger: '#FF5A5F',
  dangerSoft: 'rgba(255,90,95,0.12)',

  // Data-viz series (consistent across charts)
  dataTraining: brand.orange,
  dataRecovery: '#4FD1A1',
  dataNutrition: brand.gold,
  dataTrack: 'rgba(255,255,255,0.07)',

  overlay: 'rgba(8,13,13,0.72)',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'BarlowCondensed_800ExtraBold',
  displayItalic: 'BarlowCondensed_800ExtraBold_Italic',
  displayBold: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const layout = {
  /** Gutter on phones. */
  gutter: spacing.lg,
  /** Max readable width for forms (auth, onboarding). */
  formMaxWidth: 480,
  /** Max width for dashboard content on web/tablet. */
  contentMaxWidth: 1120,
  /** Breakpoint where dashboards switch to two columns. */
  wideBreakpoint: 900,
  tabBarHeight: 64,
} as const;

export const gradients = {
  hero: [colors.petrolBright, colors.petrol, colors.petrolDeep] as const,
  orange: [colors.orange, colors.orangeDeep] as const,
  score: [colors.orange, colors.gold] as const,
  screen: [colors.bgRaised, colors.bg] as const,
};

export type ColorToken = keyof typeof colors;
