/**
 * CineLink Design System — Single source of truth for all visual tokens.
 * Import this everywhere instead of defining local color/spacing constants.
 */
import {Dimensions, Platform, TextStyle} from 'react-native';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

// ─── Responsive helpers ────────────────────────────────────────────────────────
export const screen = {width: SCREEN_W, height: SCREEN_H};

/** Scale a size relative to a 390pt base width (iPhone 14 Pro). */
export const rs = (size: number) => Math.round((SCREEN_W / 390) * size);

// ─── Color palette ─────────────────────────────────────────────────────────────
export const Colors = {
  // Backgrounds
  background: '#0A0A0A',
  surface: '#111111',
  card: '#141414',
  cardElevated: '#1A1A1A',
  cardHigher: '#242424',
  inputBg: '#0E0E0E',
  overlay: 'rgba(0,0,0,0.75)',

  // Borders
  border: '#1E1E1E',
  borderLight: '#2A2A2A',
  borderFocus: '#3A3A3A',

  // Brand — Rose Gold
  primary: '#C9956C',
  primaryLight: '#E8C4A0',
  primaryDark: '#A3734E',
  primaryFaint: 'rgba(201,149,108,0.10)',
  primaryGlow: 'rgba(201,149,108,0.18)',
  primaryMid: 'rgba(201,149,108,0.30)',

  // Text
  textPrimary: '#F5F0EB',
  textSecondary: '#9A8A7A',
  textTertiary: '#5C5048',
  textInverse: '#0A0A0A',

  // Semantic
  success: '#4ADE80',
  successFaint: 'rgba(74,222,128,0.12)',
  successBorder: 'rgba(74,222,128,0.30)',

  error: '#EF4444',
  errorFaint: 'rgba(239,68,68,0.12)',
  errorBorder: 'rgba(239,68,68,0.30)',

  warning: '#FBBF24',
  warningFaint: 'rgba(251,191,36,0.10)',
  warningBorder: 'rgba(251,191,36,0.30)',

  info: '#60A5FA',
  infoFaint: 'rgba(96,165,250,0.12)',
  infoBorder: 'rgba(96,165,250,0.30)',

  // Category palette (matches config.ts)
  categories: {
    Movies: {
      bg: 'rgba(201,149,108,0.15)',
      text: '#C9956C',
      border: 'rgba(201,149,108,0.5)',
    },
    'Short Films': {
      bg: 'rgba(74,222,128,0.10)',
      text: '#4ADE80',
      border: 'rgba(74,222,128,0.4)',
    },
    Theatre: {
      bg: 'rgba(129,140,248,0.10)',
      text: '#818CF8',
      border: 'rgba(129,140,248,0.4)',
    },
    'YouTube / Web': {
      bg: 'rgba(248,113,113,0.10)',
      text: '#F87171',
      border: 'rgba(248,113,113,0.4)',
    },
    'TV / OTT': {
      bg: 'rgba(251,191,36,0.10)',
      text: '#FBBF24',
      border: 'rgba(251,191,36,0.4)',
    },
  } as Record<string, {bg: string; text: string; border: string}>,
} as const;

// ─── Typography ────────────────────────────────────────────────────────────────
export const Typography = {
  // Headings
  h1: {
    fontSize: rs(28),
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  h2: {
    fontSize: rs(22),
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  } as TextStyle,
  h3: {
    fontSize: rs(18),
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  } as TextStyle,
  h4: {
    fontSize: rs(16),
    fontWeight: '600',
    color: Colors.textPrimary,
  } as TextStyle,

  // Body
  bodyLg: {
    fontSize: rs(16),
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: rs(24),
  } as TextStyle,
  body: {
    fontSize: rs(14),
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: rs(22),
  } as TextStyle,
  bodySm: {
    fontSize: rs(13),
    fontWeight: '400',
    color: Colors.textPrimary,
    lineHeight: rs(20),
  } as TextStyle,

  // Secondary text
  caption: {
    fontSize: rs(12),
    fontWeight: '400',
    color: Colors.textSecondary,
  } as TextStyle,
  captionBold: {
    fontSize: rs(12),
    fontWeight: '600',
    color: Colors.textSecondary,
  } as TextStyle,
  micro: {
    fontSize: rs(10),
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  } as TextStyle,

  // Labels / buttons
  label: {
    fontSize: rs(13),
    fontWeight: '600',
    color: Colors.textPrimary,
  } as TextStyle,
  labelSm: {
    fontSize: rs(11),
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  btnLg: {fontSize: rs(16), fontWeight: '700'} as TextStyle,
  btn: {fontSize: rs(14), fontWeight: '600'} as TextStyle,
  btnSm: {fontSize: rs(13), fontWeight: '600'} as TextStyle,
};

// ─── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  xl: rs(20),
  xxl: rs(24),
  '3xl': rs(32),
  '4xl': rs(40),
  '5xl': rs(48),
  screenH: rs(20), // horizontal screen padding
  screenV: rs(16), // vertical screen padding
} as const;

// ─── Border radii ──────────────────────────────────────────────────────────────
export const Radius = {
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  xl: rs(20),
  xxl: rs(24),
  pill: rs(100),
  full: 9999,
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    android: {elevation: 2},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    android: {elevation: 5},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.45,
      shadowRadius: 16,
    },
    android: {elevation: 10},
  }),
  primary: Platform.select({
    ios: {
      shadowColor: Colors.primary,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {elevation: 6},
  }),
} as const;

// ─── Icon sizes ────────────────────────────────────────────────────────────────
export const IconSize = {
  xs: rs(14),
  sm: rs(18),
  md: rs(22),
  lg: rs(26),
  xl: rs(32),
} as const;

// ─── Hit slop (accessibility) ─────────────────────────────────────────────────
export const HitSlop = {
  sm: {top: 8, bottom: 8, left: 8, right: 8},
  md: {top: 12, bottom: 12, left: 12, right: 12},
  lg: {top: 16, bottom: 16, left: 16, right: 16},
} as const;

// ─── Animation durations ───────────────────────────────────────────────────────
export const Duration = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ─── Convenience re-exports ────────────────────────────────────────────────────
export const Theme = {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  IconSize,
  HitSlop,
  Duration,
  screen,
  rs,
} as const;

export default Theme;
