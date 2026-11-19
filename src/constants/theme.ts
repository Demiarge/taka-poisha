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
  warning: '#B45309',
  /** Behind bottom sheets. */
  scrim: 'rgba(0, 0, 0, 0.45)',
  /** Backgrounds behind white text, so these stay dark in both themes. */
  incomeFill: '#15803D',
  expenseFill: '#DC2626',
  /** Category colours: 600-700 shades, at least 4.2:1 on the light background. */
  chart: {
    blue: '#2563EB',
    violet: '#7C3AED',
    pink: '#DB2777',
    orange: '#C2410C',
    amber: '#B45309',
    teal: '#0F766E',
    cyan: '#0E7490',
    indigo: '#4338CA',
    lime: '#4D7C0F',
    rose: '#BE123C',
    /** The "Other" slice only. */
    slate: '#64748B',
  },
  /** Colour picker handles: a white ring with a dark edge shows on any colour. */
  pickerThumb: '#FFFFFF',
  pickerThumbEdge: 'rgba(0, 0, 0, 0.4)',
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
  warning: '#FBBF24',
  scrim: 'rgba(0, 0, 0, 0.7)',
  incomeFill: '#15803D',
  expenseFill: '#DC2626',
  /** 300-400 shades, at least 6:1 on black. */
  chart: {
    blue: '#60A5FA',
    violet: '#A78BFA',
    pink: '#F472B6',
    orange: '#FB923C',
    amber: '#FBBF24',
    teal: '#2DD4BF',
    cyan: '#22D3EE',
    indigo: '#818CF8',
    lime: '#A3E635',
    rose: '#FB7185',
    slate: '#94A3B8',
  },
  pickerThumb: '#FFFFFF',
  pickerThumbEdge: 'rgba(0, 0, 0, 0.4)',
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
  pill: 999,
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

/** Colours a user can give a category, in default order. Stored by key, so each theme picks its own shade. */
export const CATEGORY_COLOURS = [
  'blue',
  'orange',
  'violet',
  'teal',
  'pink',
  'amber',
  'indigo',
  'cyan',
  'rose',
  'lime',
] as const satisfies readonly (keyof ThemeColors['chart'])[];

export type CategoryColour = (typeof CATEGORY_COLOURS)[number];

/** A custom colour as "#RRGGBB" in capitals. One colour for both themes. */
export type HexColour = `#${string}`;

/** What a category's `color` column holds: a palette key or a custom hex. */
export type SavedColour = CategoryColour | HexColour;

export function isCategoryColour(value: unknown): value is CategoryColour {
  return CATEGORY_COLOURS.includes(value as CategoryColour);
}

export function isHexColour(value: unknown): value is HexColour {
  return typeof value === 'string' && /^#[0-9A-F]{6}$/.test(value);
}

export function isSavedColour(value: unknown): value is SavedColour {
  return isCategoryColour(value) || isHexColour(value);
}

/** The colour to draw: a palette key picks this theme's shade, a hex is used as it is. */
export function resolveColour(value: SavedColour, colors: ThemeColors): string {
  return isCategoryColour(value) ? colors.chart[value] : value;
}
