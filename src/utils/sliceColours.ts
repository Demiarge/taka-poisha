import { CATEGORY_COLOURS, resolveColour, type SavedColour, type ThemeColors } from '@/constants/theme';
import { OTHER_KEY, type Slice } from '@/utils/pieSlices';

/**
 * The colour to draw for each slice key. Palette colours repeat past 10 categories, so when two visible
 * slices share one, the smaller (later) slice borrows a palette colour no visible slice uses. Display only.
 */
export function sliceColours(
  slices: Slice[],
  savedOf: (key: string) => SavedColour | undefined,
  colors: ThemeColors,
): Map<string, string> {
  const wanted = slices.map((slice, index) =>
    slice.key === OTHER_KEY
      ? colors.chart.slate
      : resolveColour(savedOf(slice.key) ?? CATEGORY_COLOURS[index % CATEGORY_COLOURS.length], colors).toUpperCase(),
  );
  const taken = new Set(wanted);
  const spare = CATEGORY_COLOURS.map((key) => colors.chart[key]).filter((colour) => !taken.has(colour));

  // "Other" always stays grey, so a category that matches it is the one that moves.
  const shown = new Set<string>(slices.some((slice) => slice.key === OTHER_KEY) ? [colors.chart.slate] : []);
  const result = new Map<string, string>();
  slices.forEach((slice, index) => {
    let colour = wanted[index];
    if (slice.key !== OTHER_KEY) {
      if (shown.has(colour) && spare.length > 0) {
        colour = spare.shift()!;
      }
      shown.add(colour);
    }
    result.set(slice.key, colour);
  });
  return result;
}
