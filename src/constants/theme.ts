import type { TextStyle } from 'react-native';

const BRAND_GREEN = '#006A4E';

export const lightColors = {
  primary: BRAND_GREEN,
  onPrimary: '#FFFFFF',
  /** For text and icons: primary's dark green is unreadable on black. */
  accent: BRAND_GREEN,
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfacePressed: '#EEF0F3',
  text: '#1A1C1E',
  textMuted: '#5F6670',
  border: '#E4E7EB',
  income: '#15803D',
  expense: '#DC2626',
  /** Backgrounds behind white text, so these stay dark in both themes. */
  incomeFill: '#15803D',
  expenseFill: '#DC2626',
};

export type ThemeColors = typeof lightColors;

/** AMOLED: pure black pixels switch off and save battery. */
export const darkColors: ThemeColors = {
  primary: BRAND_GREEN,
  onPrimary: '#FFFFFF',
  accent: '#3DDC97',
  background: '#000000',
  surface: '#111111',
  surfacePressed: '#1F1F1F',
  text: '#F5F5F5',
  textMuted: '#A3A3A3',
  border: '#262626',
  income: '#4ADE80',
  expense: '#F87171',
  incomeFill: '#15803D',
  expenseFill: '#DC2626',
};

/** The balance card looks the same in both themes. */
export const hero = {
  background: BRAND_GREEN,
  gradient: `linear-gradient(135deg, ${BRAND_GREEN}, #007A58)`,
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.9)',
  divider: 'rgba(255, 255, 255, 0.25)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  gutter: 20,
  lg: 24,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 18,
} as const;

/** One file per weight. Don't add fontWeight: Android can ignore the custom font. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };

export const typography = {
  balance: { ...tabularNumbers, fontFamily: fonts.extraBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  subsection: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  item: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  amount: { ...tabularNumbers, fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  meta: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
} satisfies Record<string, TextStyle>;
