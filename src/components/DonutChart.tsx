import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { formatAmount } from '@/utils/format';
import { formatShare, ringSegmentPath, sliceAt, type Slice } from '@/utils/pieSlices';

const SIZE = 220;
const OUTER = SIZE / 2;
const INNER = OUTER * 0.64;
const CENTRE = SIZE / 2;
/** Dimmed slices while one is picked. */
const FADED = 0.3;

type DonutChartProps = {
  slices: Slice[];
  total: number;
  /** Shown under the total, e.g. "Spent". */
  caption: string;
  selectedKey: string | null;
  colourOf: (slice: Slice) => string;
  onSelect: (slice: Slice) => void;
};

/** A ring of category slices with the period total in the middle. Taps are matched by angle, so the hole does nothing. */
export function DonutChart({ slices, total, caption, selectedKey, colourOf, onSelect }: DonutChartProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const empty = slices.length === 0;

  function handlePress(event: GestureResponderEvent) {
    const slice = sliceAt(slices, event.nativeEvent.locationX, event.nativeEvent.locationY, CENTRE, INNER, OUTER);
    if (slice) {
      onSelect(slice);
    }
  }

  const summary = empty
    ? `${caption}: nothing in this period`
    : `${caption} ${formatAmount(total)}. ${slices.map((s) => `${s.label} ${formatShare(s.fraction)}`).join(', ')}`;

  return (
    <Pressable
      onPress={handlePress}
      disabled={empty}
      style={styles.chart}
      accessible
      accessibilityLabel={summary}
      accessibilityHint={empty ? undefined : 'Use the list below to pick a category'}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {empty ? (
          <Circle
            cx={CENTRE}
            cy={CENTRE}
            r={(OUTER + INNER) / 2}
            stroke={colors.border}
            strokeWidth={OUTER - INNER}
            fill="none"
          />
        ) : (
          slices.map((slice) => (
            <Path
              key={slice.key}
              d={ringSegmentPath(CENTRE, INNER, OUTER, slice.startAngle, slice.endAngle)}
              fill={colourOf(slice)}
              fillRule="evenodd"
              opacity={selectedKey && selectedKey !== slice.key ? FADED : 1}
              // A thin line in the card colour separates neighbours.
              stroke={slices.length > 1 ? colors.surface : 'none'}
              strokeWidth={2}
            />
          ))
        )}
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
          {formatAmount(total)}
        </Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chart: {
      width: SIZE,
      height: SIZE,
      alignSelf: 'center',
    },
    centre: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: OUTER - INNER + spacing.md,
    },
    total: {
      ...typography.balance,
      fontSize: 24,
      lineHeight: 30,
      color: colors.text,
    },
    caption: {
      ...typography.meta,
      color: colors.textMuted,
    },
  });
