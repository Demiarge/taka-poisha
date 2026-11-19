import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { DonutChart } from '@/components/DonutChart';
import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { categoryColourKey, type CategoryColourEntry } from '@/db/categories';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import type { Transaction, TransactionType } from '@/types/transaction';
import { formatAmount, formatMonth } from '@/utils/format';
import { buildPie, formatShare, OTHER_KEY, shiftMonth, type Period, type Slice } from '@/utils/pieSlices';
import { sliceColours } from '@/utils/sliceColours';

export type ChartFilter = { type: TransactionType; key: string; label: string; categories: string[] };

const PAGES: { type: TransactionType; caption: string; empty: string }[] = [
  { type: 'expense', caption: 'Spent', empty: 'No expenses' },
  { type: 'income', caption: 'Received', empty: 'No income' },
];

type ChartPagerProps = {
  transactions: Transaction[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  currentMonth: string;
  earliestMonth: string;
  onPageChange: (type: TransactionType) => void;
  filter: ChartFilter | null;
  onFilterChange: (filter: ChartFilter | null) => void;
  colours: Map<string, CategoryColourEntry>;
  onEditColour: (type: TransactionType, category: string) => void;
};

/** Expense and income donuts side by side; swipe between them. Shares one period. */
export function ChartPager(props: ChartPagerProps) {
  const { period, onPeriodChange, currentMonth, earliestMonth, onPageChange, onFilterChange } = props;
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const scroller = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function goToPage(index: number) {
    if (index !== page) {
      setPage(index);
      onPageChange(PAGES[index].type);
      // A filter belongs to one type, so it can't follow to the other page.
      onFilterChange(null);
    }
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width > 0) {
      goToPage(Math.round(event.nativeEvent.contentOffset.x / width));
    }
  }

  function handleDot(index: number) {
    scroller.current?.scrollTo({ x: index * width, animated: true });
    goToPage(index);
  }

  const month = period.kind === 'month' ? period.month : null;
  const canGoBack = month !== null && month > earliestMonth;
  const canGoForward = month !== null && month < currentMonth;

  return (
    <View style={styles.card}>
      <View style={styles.periodRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          disabled={!canGoBack}
          hitSlop={8}
          onPress={() => month && onPeriodChange({ kind: 'month', month: shiftMonth(month, -1) })}
          style={styles.arrow}
        >
          <Ionicons name="chevron-back" size={22} color={canGoBack ? colors.accent : colors.border} />
        </Pressable>
        <Text style={styles.periodLabel} accessibilityRole="header">
          {month ? formatMonth(month) : 'All time'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          disabled={!canGoForward}
          hitSlop={8}
          onPress={() => month && onPeriodChange({ kind: 'month', month: shiftMonth(month, 1) })}
          style={styles.arrow}
        >
          <Ionicons name="chevron-forward" size={22} color={canGoForward ? colors.accent : colors.border} />
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: month === null }}
          onPress={() => onPeriodChange(month ? { kind: 'all' } : { kind: 'month', month: currentMonth })}
          style={[styles.pill, month === null && styles.pillOn]}
        >
          <Text style={[styles.pillLabel, month === null && styles.pillLabelOn]}>All time</Text>
        </Pressable>
      </View>

      <View onLayout={handleLayout}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          nestedScrollEnabled
        >
          {width > 0 &&
            PAGES.map((pageInfo) => (
              <View key={pageInfo.type} style={{ width }}>
                <ChartPage {...props} {...pageInfo} />
              </View>
            ))}
        </ScrollView>
      </View>

      <View style={styles.dots}>
        {PAGES.map((pageInfo, index) => (
          <Pressable
            key={pageInfo.type}
            accessibilityRole="tab"
            accessibilityLabel={pageInfo.type === 'expense' ? 'Expenses chart' : 'Income chart'}
            accessibilityState={{ selected: index === page }}
            hitSlop={10}
            onPress={() => handleDot(index)}
          >
            <View style={[styles.dot, index === page && styles.dotOn]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type ChartPageProps = ChartPagerProps & { type: TransactionType; caption: string; empty: string };

function ChartPage({ transactions, period, type, caption, empty, filter, onFilterChange, colours, onEditColour }: ChartPageProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const pie = useMemo(() => buildPie(transactions, type, period), [transactions, type, period]);
  const selectedKey = filter?.type === type ? filter.key : null;

  const colourByKey = useMemo(
    () => sliceColours(pie.slices, (key) => colours.get(categoryColourKey(type, key))?.colour, colors),
    [pie.slices, colours, type, colors],
  );

  function toggle(slice: Slice) {
    onFilterChange(
      selectedKey === slice.key ? null : { type, key: slice.key, label: slice.label, categories: slice.categories },
    );
  }

  return (
    <View style={styles.page}>
      <DonutChart
        slices={pie.slices}
        total={pie.total}
        caption={caption}
        selectedKey={selectedKey}
        colourOf={(slice) => colourByKey.get(slice.key) ?? colors.border}
        onSelect={toggle}
      />
      {pie.slices.length === 0 ? (
        <Text style={styles.empty}>
          {empty} {period.kind === 'month' ? `in ${formatMonth(period.month)}` : 'yet'}
        </Text>
      ) : (
        <View>
          {pie.slices.map((slice) => {
            const selected = selectedKey === slice.key;
            const isOther = slice.key === OTHER_KEY;
            return (
              <Pressable
                key={slice.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityHint={selected ? 'Shows all transactions again' : 'Shows only this category below'}
                onPress={() => toggle(slice)}
                style={({ pressed }) => [styles.legendRow, (pressed || selected) && styles.legendRowOn]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Change colour for ${slice.label}`}
                  disabled={isOther}
                  hitSlop={12}
                  onPress={() => onEditColour(type, slice.key)}
                  style={styles.dotButton}
                >
                  <View style={[styles.legendDot, { backgroundColor: colourByKey.get(slice.key) }]} />
                </Pressable>
                <Text style={styles.legendName} numberOfLines={1}>
                  {isOther ? `Other (${slice.categories.length})` : slice.label}
                </Text>
                <Text style={styles.legendAmount}>{formatAmount(slice.total)}</Text>
                <Text style={styles.legendShare}>{formatShare(slice.fraction)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      marginTop: spacing.md,
      gap: spacing.md,
      overflow: 'hidden',
    },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    arrow: {
      padding: spacing.xs,
    },
    periodLabel: {
      ...typography.item,
      flex: 1,
      textAlign: 'center',
      color: colors.text,
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing.sm,
    },
    pillOn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
    },
    pillLabelOn: {
      color: colors.onPrimary,
    },
    page: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    legendRowOn: {
      backgroundColor: colors.surfacePressed,
    },
    dotButton: {
      padding: spacing.xs,
    },
    legendDot: {
      width: 14,
      height: 14,
      borderRadius: radius.pill,
    },
    legendName: {
      ...typography.item,
      flex: 1,
      color: colors.text,
    },
    legendAmount: {
      ...typography.amount,
      color: colors.text,
    },
    legendShare: {
      ...typography.meta,
      fontVariant: ['tabular-nums'],
      width: 44,
      textAlign: 'right',
      color: colors.textMuted,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
    },
    dotOn: {
      backgroundColor: colors.accent,
    },
  });
