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
  warningSoft: 'rgba(242,193,78,0.10)',
  warningBorder: 'rgba(242,193,78,0.35)',
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
  /** Minimum touch target (Apple HIG 44 pt; WCAG 2.5.8 asks ≥ 24). */
  minTouch: 44,
} as const;

export const gradients = {
  hero: [colors.petrolBright, colors.petrol, colors.petrolDeep] as const,
  orange: [colors.orange, colors.orangeDeep] as const,
  score: [colors.orange, colors.gold] as const,
  screen: [colors.bgRaised, colors.bg] as const,
};

export type ColorToken = keyof typeof colors;

/* ------------------------------------------------------------------ */
/* Depth: surfaces, elevation, light                                   */
/* ------------------------------------------------------------------ */

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');

/**
 * Surface hierarchy — pick by importance, never for decoration:
 * - base:     most content (lists, secondary cards)
 * - raised:   a group that must stand out from the base layer
 * - featured: the ONE focal card of a screen (score, today's workout). The
 *             only level with a glow and a deep shadow.
 */
export const surfaces = {
  base: { backgroundColor: colors.surface, borderColor: colors.border },
  raised: { backgroundColor: colors.surfaceAlt, borderColor: 'rgba(214,183,122,0.16)' },
  featured: { backgroundColor: colors.petrolDeep, borderColor: colors.borderStrong },
} as const;

export type SurfaceLevel = keyof typeof surfaces;

/** Shadows (React Native 0.88 `boxShadow`: same syntax on web, iOS and Android). */
export const elevation = {
  base: 'none',
  raised: '0 10px 24px -14px rgba(0,0,0,0.6)',
  // Light from above: a hairline highlight on the top edge plus a soft drop.
  featured: `inset 0 1px 0 rgba(${rgb('#F4F1EA')},0.07), 0 24px 48px -20px rgba(0,0,0,0.75)`,
} as const satisfies Record<SurfaceLevel, string>;

/**
 * Controlled light for featured surfaces: one glow per card, at most two per
 * screen. CSS radial gradients (`backgroundImage`): no images, no SVG.
 */
export const glows = {
  petrol: `radial-gradient(ellipse 90% 80% at 0% 0%, rgba(${rgb(colors.petrolBright)},0.75), rgba(${rgb(colors.petrolBright)},0))`,
  orange: `radial-gradient(ellipse 70% 70% at 100% 0%, rgba(${rgb(colors.orange)},0.22), rgba(${rgb(colors.orange)},0))`,
  gold: `radial-gradient(ellipse 70% 70% at 100% 0%, rgba(${rgb(colors.gold)},0.18), rgba(${rgb(colors.gold)},0))`,
} as const;

export type GlowTone = keyof typeof glows;

/* ------------------------------------------------------------------ */
/* Sport identity                                                      */
/* ------------------------------------------------------------------ */

/**
 * Each sport family has an accent (brand palette only) and a line motif, so
 * sports are told apart by shape as well as color (color-blind safe).
 * `accentLight` is the brand color lifted for text/lines on dark surfaces.
 */
export const sportFamilies = {
  combat: { label: 'Dövüş', accent: brand.orange, accentLight: '#FF8A5C', motif: 'strike' },
  strength: { label: 'Kuvvet', accent: brand.gold, accentLight: '#E2C893', motif: 'plates' },
  endurance: { label: 'Dayanıklılık', accent: '#0D5A52', accentLight: '#3E9C8F', motif: 'flow' },
  team: { label: 'Takım', accent: brand.gold, accentLight: '#E2C893', motif: 'field' },
  racket: { label: 'Raket', accent: brand.orange, accentLight: '#FF8A5C', motif: 'court' },
} as const;

export type SportFamily = keyof typeof sportFamilies;
export type SportMotif = (typeof sportFamilies)[SportFamily]['motif'];

/** Badge tiers: three shades of the champagne-gold family. */
export const badgeTiers = {
  bronze: { label: 'Bronz', ring: '#A9784C', ringLight: '#D19B6A', face: '#2A1C12' },
  silver: { label: 'Gümüş', ring: '#BDB6A6', ringLight: '#E6E0D2', face: '#1E201F' },
  gold: { label: 'Altın', ring: brand.gold, ringLight: '#F0DDB0', face: '#2B2414' },
} as const;

export type BadgeTier = keyof typeof badgeTiers;
