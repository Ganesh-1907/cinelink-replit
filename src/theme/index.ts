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
  background: '#090A0C', surface: '#111216', card: '#16171D',
  cardElevated: '#1E2028', cardHigher: '#262933', inputBg: '#111216',
  overlay: 'rgba(0,0,0,0.75)', border: '#1E2028', borderLight: '#262933', borderFocus: '#CF9F5A',
  primary: '#CF9F5A', primaryLight: '#E8CEAA', primaryDark: '#9C6E35',
  primaryFaint: 'rgba(207,159,90,0.10)', primaryGlow: 'rgba(207,159,90,0.18)', primaryMid: 'rgba(207,159,90,0.30)',
  textPrimary: '#F7F8FA', textSecondary: '#9AA2AC', textTertiary: '#5C646E', textInverse: '#090A0C',
  success: '#34D399', successFaint: 'rgba(52,211,153,0.10)', successBorder: 'rgba(52,211,153,0.30)',
  error: '#F87171', errorFaint: 'rgba(248,113,113,0.10)', errorBorder: 'rgba(248,113,113,0.30)',
  warning: '#FBBF24', warningFaint: 'rgba(251,191,36,0.10)', warningBorder: 'rgba(251,191,36,0.30)',
  info: '#60A5FA', infoFaint: 'rgba(96,165,250,0.12)', infoBorder: 'rgba(96,165,250,0.30)',
};

export const lightColors: ColorPalette = {
  background: '#FFFFFF', surface: '#FAFAFA', card: '#FFFFFF',
  cardElevated: '#F8F9FA', cardHigher: '#F1F3F5', inputBg: '#F8F9FA',
  overlay: 'rgba(0,0,0,0.4)', border: '#EBECEF', borderLight: '#F4F5F7', borderFocus: '#CF9F5A',
  primary: '#CF9F5A', primaryLight: '#E8CEAA', primaryDark: '#9C6E35',
  primaryFaint: 'rgba(207,159,90,0.12)', primaryGlow: 'rgba(207,159,90,0.15)', primaryMid: 'rgba(207,159,90,0.25)',
  textPrimary: '#1A1C1E', textSecondary: '#5A626A', textTertiary: '#8A949E', textInverse: '#FFFFFF',
  success: '#10B981', successFaint: 'rgba(16,185,129,0.08)', successBorder: 'rgba(16,185,129,0.25)',
  error: '#EF4444', errorFaint: 'rgba(239,68,68,0.08)', errorBorder: 'rgba(239,68,68,0.25)',
  warning: '#F59E0B', warningFaint: 'rgba(245,158,11,0.08)', warningBorder: 'rgba(245,158,11,0.25)',
  info: '#3B82F6', infoFaint: 'rgba(59,130,246,0.08)', infoBorder: 'rgba(59,130,246,0.25)',
};

// Mutable Colors singleton
export const Colors: ColorPalette = {...darkColors};

// Monkey-patch StyleSheet.create to make cached stylesheets responsive to theme changes.
StyleSheet.create = ((stylesObj: any) => {
  const result: any = {};

  for (const styleKey of Object.keys(stylesObj)) {
    const styleVal = stylesObj[styleKey];
    if (styleVal && typeof styleVal === 'object') {
      const propertyThemeMap: Record<string, string> = {};
      
      for (const propKey of Object.keys(styleVal)) {
        const val = styleVal[propKey];
        if (typeof val === 'string') {
          // Find key in darkColors
          const darkKey = Object.keys(darkColors).find(k => (darkColors as any)[k] === val);
          if (darkKey) {
            propertyThemeMap[propKey] = darkKey;
            continue;
          }
          // Find key in lightColors
          const lightKey = Object.keys(lightColors).find(k => (lightColors as any)[k] === val);
          if (lightKey) {
            propertyThemeMap[propKey] = lightKey;
            continue;
          }
        }
      }

      const styleValCopy = { ...styleVal };
      result[styleKey] = new Proxy(styleValCopy, {
        get(target, prop) {
          if (typeof prop === 'string' && propertyThemeMap[prop]) {
            return (Colors as any)[propertyThemeMap[prop]];
          }
          return Reflect.get(target, prop);
        },
        ownKeys(target) {
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, prop) {
          const desc = Reflect.getOwnPropertyDescriptor(target, prop);
          if (desc && typeof prop === 'string' && propertyThemeMap[prop]) {
            if (desc.get) {
              desc.get = () => (Colors as any)[propertyThemeMap[prop]];
            } else {
              desc.value = (Colors as any)[propertyThemeMap[prop]];
            }
          }
          return desc;
        }
      });
    } else {
      result[styleKey] = styleVal;
    }
  }

  return result;
}) as any;

// Mutable Typography (rebuilds when applyColors is called)
export const Typography: Record<string, TextStyle> = {};
const __buildTypography = () => {
  Object.assign(Typography, {
    h1:         {fontSize: rs(28), fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5} as TextStyle,
    h2:         {fontSize: rs(22), fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3} as TextStyle,
    h3:         {fontSize: rs(18), fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.2} as TextStyle,
    h4:         {fontSize: rs(16), fontWeight: '600', color: Colors.textPrimary} as TextStyle,
    bodyLg:     {fontSize: rs(16), fontWeight: '400', color: Colors.textPrimary, lineHeight: rs(24)} as TextStyle,
    body:       {fontSize: rs(14), fontWeight: '400', color: Colors.textPrimary, lineHeight: rs(22)} as TextStyle,
    bodySm:     {fontSize: rs(13), fontWeight: '400', color: Colors.textPrimary, lineHeight: rs(20)} as TextStyle,
    caption:    {fontSize: rs(12), fontWeight: '400', color: Colors.textSecondary} as TextStyle,
    captionBold:{fontSize: rs(12), fontWeight: '600', color: Colors.textSecondary} as TextStyle,
    micro:      {fontSize: rs(10), fontWeight: '500', color: Colors.textTertiary, letterSpacing: 0.5} as TextStyle,
    label:      {fontSize: rs(13), fontWeight: '600', color: Colors.textPrimary} as TextStyle,
    labelSm:    {fontSize: rs(11), fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase'} as TextStyle,
    btnLg:      {fontSize: rs(16), fontWeight: '700'} as TextStyle,
    btn:        {fontSize: rs(14), fontWeight: '600'} as TextStyle,
    btnSm:      {fontSize: rs(13), fontWeight: '600'} as TextStyle,
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
  Movies:        {bg: 'rgba(201,149,108,0.15)', text: '#C9956C', border: 'rgba(201,149,108,0.5)'},
  'Short Films': {bg: 'rgba(74,222,128,0.10)', text: '#4ADE80', border: 'rgba(74,222,128,0.4)'},
  Theatre:       {bg: 'rgba(129,140,248,0.10)', text: '#818CF8', border: 'rgba(129,140,248,0.4)'},
  'YouTube/Web': {bg: 'rgba(248,113,113,0.10)', text: '#F87171', border: 'rgba(248,113,113,0.4)'},
  'TV/OTT':      {bg: 'rgba(251,191,36,0.10)', text: '#FBBF24', border: 'rgba(251,191,36,0.4)'},
};

const categoryColorsLight: Record<string, {bg: string; text: string; border: string}> = {
  Movies:        {bg: 'rgba(201,149,108,0.12)', text: '#A3734E', border: 'rgba(201,149,108,0.3)'},
  'Short Films': {bg: 'rgba(22,163,74,0.08)',   text: '#16A34A', border: 'rgba(22,163,74,0.25)'},
  Theatre:       {bg: 'rgba(79,70,229,0.08)',   text: '#4F70E5', border: 'rgba(79,70,229,0.25)'},
  'YouTube/Web': {bg: 'rgba(220,38,38,0.08)',   text: '#DC2626', border: 'rgba(220,38,38,0.25)'},
  'TV/OTT':      {bg: 'rgba(217,119,6,0.08)',   text: '#D97706', border: 'rgba(217,119,6,0.25)'},
};

export const categoryColors: Record<string, {bg: string; text: string; border: string}> = new Proxy({} as any, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    const isLight = Colors.background === '#FFFFFF';
    const source = isLight ? categoryColorsLight : categoryColorsDark;
    const normalizedProp = prop.trim().replace(/\s*\/\s*/g, '/');
    return source[normalizedProp] || source[prop] || source['Movies'];
  }
});

// ─── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: rs(4), sm: rs(8), md: rs(12), lg: rs(16), xl: rs(20),
  xxl: rs(24), '3xl': rs(32), '4xl': rs(40), '5xl': rs(48),
  screenH: rs(20), screenV: rs(16),
} as const;

export const Radius = {
  xs: rs(4), sm: rs(8), md: rs(12), lg: rs(16), xl: rs(20), xxl: rs(24),
  pill: rs(100), full: 9999,
} as const;

export const Shadows = {
  sm: Platform.select({ios: {shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.04,shadowRadius:3}, android:{elevation:2}}),
  md: Platform.select({ios: {shadowColor:'#000',shadowOffset:{width:0,height:6},shadowOpacity:0.06,shadowRadius:8}, android:{elevation:4}}),
  lg: Platform.select({ios: {shadowColor:'#000',shadowOffset:{width:0,height:12},shadowOpacity:0.10,shadowRadius:16}, android:{elevation:8}}),
  primary: Platform.select({ios: {shadowColor: Colors.primary, shadowOffset:{width:0,height:4},shadowOpacity:0.2,shadowRadius:10}, android:{elevation:5}}),
} as const;

export const IconSize = {xs: rs(14), sm: rs(18), md: rs(22), lg: rs(26), xl: rs(32)} as const;
export const HitSlop = {sm: {top:8,bottom:8,left:8,right:8}, md: {top:12,bottom:12,left:12,right:12}, lg: {top:16,bottom:16,left:16,right:16}} as const;
export const Duration = {fast: 150, normal: 250, slow: 400} as const;

export const Theme = {Colors, Typography, Spacing, Radius, Shadows, IconSize, HitSlop, Duration, screen, rs} as const;
export default Theme;
