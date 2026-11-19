import { darkColors, lightColors, type HexColour } from '@/constants/theme';

/** Channels 0-255. */
export type Rgb = { r: number; g: number; b: number };
/** Hue 0-360; saturation and brightness 0-1. */
export type Hsv = { h: number; s: number; v: number };

/** WCAG's minimum for graphics such as chart slices. */
const MIN_CONTRAST = 3;

/** "#RGB" or "#RRGGBB" in any case, as "#RRGGBB" in capitals; null for anything else, including alpha. */
export function parseHex(text: string): HexColour | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) {
    return null;
  }
  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  return `#${digits.toUpperCase()}`;
}

export function hexToRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1, 7), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): HexColour {
  const digits = [r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('');
  return `#${digits.toUpperCase()}`;
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
}

/** Greys and black have no hue, so `fallbackHue` keeps the slider where it was. */
export function rgbToHsv({ r, g, b }: Rgb, fallbackHue = 0): Hsv {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const range = max - Math.min(red, green, blue);
  let h = fallbackHue;
  if (range > 0) {
    if (max === red) {
      h = ((green - blue) / range + 6) % 6;
    } else if (max === green) {
      h = (blue - red) / range + 2;
    } else {
      h = (red - green) / range + 4;
    }
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : range / max, v: max };
}

export const hsvToHex = (hsv: Hsv) => rgbToHex(hsvToRgb(hsv));

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Themes where a colour falls below 3:1 on the screen background or a card (AMOLED black included). */
export function hardToSeeIn(hex: HexColour): ('light' | 'dark')[] {
  const themes = { light: lightColors, dark: darkColors } as const;
  return (['light', 'dark'] as const).filter((theme) =>
    [themes[theme].background, themes[theme].surface].some((behind) => contrastRatio(hex, behind) < MIN_CONTRAST),
  );
}
