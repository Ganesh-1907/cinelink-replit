/**
 * CineLink Design System — Single source of truth for all visual tokens.
 * Theme-aware: applyColors() swaps all values including Typography refs.
 */
import {Dimensions, Platform, TextStyle, StyleSheet} from 'react-native';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

export const screen = {width: SCREEN_W, height: SCREEN_H};
export const rs = (size: number) => Math.round((SCREEN_W / 390) * size);

// ─── Color palette type ───────────────────────────────────────────────────────
export type ColorPalette = {
  background: string; surface: string; card: string; cardElevated: string;
  cardHigher: string; inputBg: string; overlay: string;
  border: string; borderLight: string; borderFocus: string;
  primary: string; primaryLight: string; primaryDark: string;
  primaryFaint: string; primaryGlow: string; primaryMid: string;
  textPrimary: string; textSecondary: string; textTertiary: string; textInverse: string;
  success: string; successFaint: string; successBorder: string;
  error: string; errorFaint: string; errorBorder: string;
  warning: string; warningFaint: string; warningBorder: string;
  info: string; infoFaint: string; infoBorder: string;
};

export const darkColors: ColorPalette = {
  background: '#09090B', surface: '#111113', card: '#18181B',
  cardElevated: '#232326', cardHigher: '#2E2E32', inputBg: '#111113',
  overlay: 'rgba(0,0,0,0.75)', border: '#2E2E32', borderLight: '#232326', borderFocus: '#F5C451',
  primary: '#F5C451', primaryLight: '#FFE08A', primaryDark: '#E8B43D',
  primaryFaint: 'rgba(245,196,81,0.10)', primaryGlow: 'rgba(245,196,81,0.18)', primaryMid: 'rgba(245,196,81,0.30)',
  textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', textTertiary: '#717178', textInverse: '#09090B',
  success: '#22C55E', successFaint: 'rgba(34,197,94,0.10)', successBorder: 'rgba(34,197,94,0.30)',
  error: '#E63946', errorFaint: 'rgba(230,57,70,0.10)', errorBorder: 'rgba(230,57,70,0.30)',
  warning: '#F59E0B', warningFaint: 'rgba(245,158,11,0.10)', warningBorder: 'rgba(245,158,11,0.30)',
  info: '#3B82F6', infoFaint: 'rgba(59,130,246,0.12)', infoBorder: 'rgba(59,130,246,0.30)',
};

export const lightColors: ColorPalette = {
  background: '#F8F8F6', surface: '#F2F2EF', card: '#FFFFFF',
  cardElevated: '#FAFAFA', cardHigher: '#E6E6E6', inputBg: '#F2F2EF',
  overlay: 'rgba(0,0,0,0.4)', border: '#E6E6E6', borderLight: '#F2F2EF', borderFocus: '#D4A017',
  primary: '#D4A017', primaryLight: '#F5D878', primaryDark: '#B8890E',
  primaryFaint: 'rgba(212,160,23,0.12)', primaryGlow: 'rgba(212,160,23,0.15)', primaryMid: 'rgba(212,160,23,0.25)',
  textPrimary: '#1F1F23', textSecondary: '#6B7280', textTertiary: '#9CA3AF', textInverse: '#FFFFFF',
  success: '#22C55E', successFaint: 'rgba(34,197,94,0.08)', successBorder: 'rgba(34,197,94,0.25)',
  error: '#E63946', errorFaint: 'rgba(230,57,70,0.08)', errorBorder: 'rgba(230,57,70,0.25)',
  warning: '#F59E0B', warningFaint: 'rgba(245,158,11,0.08)', warningBorder: 'rgba(245,158,11,0.25)',
  info: '#2563EB', infoFaint: 'rgba(37,99,235,0.08)', infoBorder: 'rgba(37,99,235,0.25)',
};

// Mutable Colors singleton
export const Colors: ColorPalette = {...darkColors};

// Monkey-patch StyleSheet.create to make cached stylesheets responsive to theme changes
// by returning distinct style object references for light and dark modes.
StyleSheet.create = ((stylesObj: any) => {
  const originalStyles = { ...stylesObj };
  const resolvedCache: Record<'light' | 'dark', Record<string, any>> = {
    light: {},
    dark: {}
  };

  const getResolvedStyle = (styleKey: string, mode: 'light' | 'dark') => {
    if (resolvedCache[mode][styleKey]) {
      return resolvedCache[mode][styleKey];
    }

    const styleVal = originalStyles[styleKey];
    if (!styleVal || typeof styleVal !== 'object') {
      return styleVal;
    }

    const palette = mode === 'light' ? lightColors : darkColors;
    const resolvedStyle: any = {};
    for (const propKey of Object.keys(styleVal)) {
      const val = styleVal[propKey];
      if (typeof val === 'string') {
        const darkKey = Object.keys(darkColors).find(k => (darkColors as any)[k] === val);
        const lightKey = Object.keys(lightColors).find(k => (lightColors as any)[k] === val);
        if (darkKey) {
          resolvedStyle[propKey] = (palette as any)[darkKey];
        } else if (lightKey) {
          resolvedStyle[propKey] = (palette as any)[lightKey];
        } else {
          resolvedStyle[propKey] = val;
        }
      } else {
        resolvedStyle[propKey] = val;
      }
    }

    resolvedCache[mode][styleKey] = resolvedStyle;
    return resolvedStyle;
  };

  return new Proxy({}, {
    get(target, styleKey) {
      if (typeof styleKey !== 'string') {
        return undefined;
      }
      if (!(styleKey in originalStyles)) {
        return undefined;
      }
      const currentMode = Colors.background === '#F8F8F6' ? 'light' : 'dark';
      return getResolvedStyle(styleKey, currentMode);
    },
    has(target, styleKey) {
      return typeof styleKey === 'string' && styleKey in originalStyles;
    },
    ownKeys() {
      return Reflect.ownKeys(originalStyles);
    },
    getOwnPropertyDescriptor(target, styleKey) {
      if (typeof styleKey !== 'string') {
        return undefined;
      }
      const currentMode = Colors.background === '#F8F8F6' ? 'light' : 'dark';
      return {
        enumerable: true,
        configurable: true,
        writable: true,
        value: getResolvedStyle(styleKey, currentMode)
      };
    }
  });
}) as any;

// Mutable Typography (rebuilds when applyColors is called)
export const Typography: Record<string, TextStyle> = {};
const __buildTypography = () => {
  Object.assign(Typography, {
    h1:         {fontFamily: 'Poppins-SemiBold', fontSize: rs(34), fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.5} as TextStyle,
    h2:         {fontFamily: 'Poppins-SemiBold', fontSize: rs(28), fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.3} as TextStyle,
    h3:         {fontFamily: 'Poppins-SemiBold', fontSize: rs(24), fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.2} as TextStyle,
    h4:         {fontFamily: 'Poppins-SemiBold', fontSize: rs(20), fontWeight: '600', color: Colors.textPrimary} as TextStyle,
    bodyLg:     {fontFamily: 'Inter-Regular', fontSize: rs(18), fontWeight: '400', color: Colors.textPrimary, lineHeight: rs(26)} as TextStyle,
    body:       {fontFamily: 'Inter-Regular', fontSize: rs(16), fontWeight: '400', color: Colors.textPrimary, lineHeight: rs(24)} as TextStyle,
    bodySm:     {fontFamily: 'Inter-Regular', fontSize: rs(14), fontWeight: '400', color: Colors.textPrimary, lineHeight: rs(22)} as TextStyle,
    caption:    {fontFamily: 'Inter-Regular', fontSize: rs(12), fontWeight: '400', color: Colors.textSecondary} as TextStyle,
    captionBold:{fontFamily: 'Inter-SemiBold', fontSize: rs(12), fontWeight: '600', color: Colors.textSecondary} as TextStyle,
    micro:      {fontFamily: 'Inter-Regular', fontSize: rs(10), fontWeight: '500', color: Colors.textTertiary, letterSpacing: 0.5} as TextStyle,
    label:      {fontFamily: 'Inter-SemiBold', fontSize: rs(14), fontWeight: '600', color: Colors.textPrimary} as TextStyle,
    labelSm:    {fontFamily: 'Inter-SemiBold', fontSize: rs(12), fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase'} as TextStyle,
    btnLg:      {fontFamily: 'Inter-SemiBold', fontSize: rs(16), fontWeight: '600'} as TextStyle,
    btn:        {fontFamily: 'Inter-SemiBold', fontSize: rs(14), fontWeight: '600'} as TextStyle,
    btnSm:      {fontFamily: 'Inter-SemiBold', fontSize: rs(12), fontWeight: '600'} as TextStyle,
  });
};
__buildTypography();

export function applyColors(palette: ColorPalette) {
  for (const key of Object.keys(palette) as (keyof ColorPalette)[]) {
    (Colors as any)[key] = palette[key];
  }
  __buildTypography();
}

// ─── Category colors ───────────────────────────────────────────────────────────
const categoryColorsDark: Record<string, {bg: string; text: string; border: string}> = {
  Movies:        {bg: 'rgba(245,196,81,0.15)', text: '#F5C451', border: 'rgba(245,196,81,0.5)'},
  'Short Films': {bg: 'rgba(34,197,94,0.10)',  text: '#22C55E', border: 'rgba(34,197,94,0.4)'},
  Theatre:       {bg: 'rgba(59,130,246,0.10)',  text: '#3B82F6', border: 'rgba(59,130,246,0.4)'},
  'YouTube/Web': {bg: 'rgba(230,57,70,0.10)',  text: '#E63946', border: 'rgba(230,57,70,0.4)'},
  'TV/OTT':      {bg: 'rgba(245,158,11,0.10)',  text: '#F59E0B', border: 'rgba(245,158,11,0.4)'},
};

const categoryColorsLight: Record<string, {bg: string; text: string; border: string}> = {
  Movies:        {bg: 'rgba(212,160,23,0.12)', text: '#D4A017', border: 'rgba(212,160,23,0.3)'},
  'Short Films': {bg: 'rgba(34,197,94,0.08)',  text: '#22C55E', border: 'rgba(34,197,94,0.25)'},
  Theatre:       {bg: 'rgba(37,99,235,0.08)',  text: '#2563EB', border: 'rgba(37,99,235,0.25)'},
  'YouTube/Web': {bg: 'rgba(230,57,70,0.08)',  text: '#E63946', border: 'rgba(230,57,70,0.25)'},
  'TV/OTT':      {bg: 'rgba(245,158,11,0.08)',  text: '#F59E0B', border: 'rgba(245,158,11,0.25)'},
};

export const categoryColors: Record<string, {bg: string; text: string; border: string}> = new Proxy({} as any, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    const isLight = Colors.background === '#F8F8F6';
    const source = isLight ? categoryColorsLight : categoryColorsDark;
    const normalizedProp = prop.trim().replace(/\s*\/\s*/g, '/');
    return source[normalizedProp] || source[prop] || source['Movies'];
  }
});

// ─── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: rs(4), sm: rs(8), md: rs(16), lg: rs(24), xl: rs(32),
  xxl: rs(48), '3xl': rs(64), '4xl': rs(80), '5xl': rs(96),
  screenH: rs(20), screenV: rs(16),
} as const;

export const Radius = {
  xs: rs(4), sm: rs(8), md: rs(12), lg: rs(16), xl: rs(20), xxl: rs(24),
  button: rs(14),
  search: rs(16),
  card: rs(18),
  bottomSheet: rs(28),
  pill: rs(100),
  full: 9999,
} as const;

export const Shadows = {
  sm: Platform.select({
    ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.04, shadowRadius: 3},
    android: {elevation: 2}
  }),
  md: Platform.select({
    ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.08, shadowRadius: 12},
    android: {elevation: 4}
  }),
  lg: Platform.select({
    ios: {shadowColor: '#000', shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.45, shadowRadius: 16},
    android: {elevation: 8}
  }),
  primary: Platform.select({
    ios: {
      shadowColor: '#F5C451',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.05,
      shadowRadius: 20
    },
    android: {elevation: 3}
  }),
} as const;

export const IconSize = {xs: rs(14), sm: rs(18), md: rs(22), lg: rs(26), xl: rs(32)} as const;
export const HitSlop = {sm: {top:8,bottom:8,left:8,right:8}, md: {top:12,bottom:12,left:12,right:12}, lg: {top:16,bottom:16,left:16,right:16}} as const;
export const Duration = {fast: 200, normal: 250, slow: 300} as const;

export const Theme = {Colors, Typography, Spacing, Radius, Shadows, IconSize, HitSlop, Duration, screen, rs} as const;
export default Theme;
