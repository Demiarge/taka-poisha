import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { ChartPager, type ChartFilter } from '@/components/ChartPager';
import { ColourPicker } from '@/components/ColourPicker';
import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { categoryColourKey } from '@/db/categories';
import { useCategoryColours } from '@/hooks/useCategoryColours';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { useTransactions } from '@/hooks/useTransactions';
import type { TransactionType } from '@/types/transaction';
import { formatAmount, formatMonth, toIsoDate } from '@/utils/format';
import { groupTransactions } from '@/utils/groupTransactions';
import { inPeriod, type Period } from '@/utils/pieSlices';

/** Category charts on top; below, every transaction grouped by month and category, or one chart category's. */
export default function HistoryScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const transactions = useTransactions();
  const { colours, changeColour } = useCategoryColours();
  const currentMonth = toIsoDate(new Date()).slice(0, 7);
  const [period, setPeriod] = useState<Period>({ kind: 'month', month: currentMonth });
  const [filter, setFilter] = useState<ChartFilter | null>(null);
  const [editing, setEditing] = useState<{ type: TransactionType; name: string } | null>(null);

  const all = useMemo(() => transactions ?? [], [transactions]);
  // Newest first, so the last one is the oldest.
  const oldest = all.at(-1)?.date.slice(0, 7);
  const earliestMonth = oldest && oldest < currentMonth ? oldest : currentMonth;

  const shown = useMemo(
    () =>
      filter
        ? all.filter((t) => t.type === filter.type && filter.categories.includes(t.category) && inPeriod(t, period))
        : all,
    [all, filter, period],
  );
  const sections = useMemo(() => groupTransactions(shown), [shown]);
  const periodName = period.kind === 'month' ? formatMonth(period.month) : 'all time';

  const header = (
    <View>
      <ChartPager
        transactions={all}
        period={period}
        onPeriodChange={setPeriod}
        currentMonth={currentMonth}
        earliestMonth={earliestMonth}
        onPageChange={() => setFilter(null)}
        filter={filter}
        onFilterChange={setFilter}
        colours={colours}
        onEditColour={(type, name) => setEditing({ type, name })}
      />
      {filter && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Showing ${filter.label}, ${periodName}. Show everything`}
          onPress={() => setFilter(null)}
          style={styles.filterChip}
        >
          <Text style={styles.filterLabel} numberOfLines={1}>
            {filter.label} · {periodName}
          </Text>
          <Ionicons name="close" size={18} color={colors.onPrimary} />
        </Pressable>
      )}
    </View>
  );

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(transaction) => String(transaction.id)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={transactions ? header : undefined}
      ListEmptyComponent={
        transactions ? (
          <EmptyState message={filter ? `No ${filter.label} in ${periodName}.` : 'Nothing here yet.'} />
        ) : undefined
      }
      renderSectionHeader={({ section }) => {
        const isIncome = section.type === 'income';
        return (
          <View>
            {section.isFirstInMonth && <Text style={styles.month}>{formatMonth(section.month)}</Text>}
            <View style={styles.categoryHeader}>
              <Text style={styles.category} numberOfLines={1}>
                {section.category}
              </Text>
              <Text style={[styles.categoryTotal, isIncome && { color: colors.income }]}>
                {isIncome ? '+' : '−'}
                {formatAmount(section.total)}
              </Text>
            </View>
          </View>
        );
      }}
      renderItem={({ item, index, section }) => (
        <View
          style={[
            styles.rowCard,
            index === 0 && styles.firstRow,
            index === section.data.length - 1 && styles.lastRow,
          ]}
        >
          <TransactionRow transaction={item} showCategory={false} />
        </View>
      )}
      ListFooterComponent={
        <ColourPicker
          category={editing?.name ?? null}
          value={editing ? (colours.get(categoryColourKey(editing.type, editing.name))?.colour ?? null) : null}
          others={
            editing
              ? [...colours.values()].filter(
                  (entry) => entry.type === editing.type && entry.name.toLowerCase() !== editing.name.toLowerCase(),
                )
              : []
          }
          onPick={(colour) => {
            if (editing) {
              changeColour(editing.type, editing.name, colour).catch(() => {});
            }
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      }
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.gutter,
      paddingBottom: spacing.gutter,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      maxWidth: '100%',
    },
    filterLabel: {
      ...typography.meta,
      flexShrink: 1,
      color: colors.onPrimary,
    },
    month: {
      ...typography.subsection,
      color: colors.text,
      marginTop: spacing.gutter,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    category: {
      ...typography.meta,
      flex: 1,
      color: colors.textMuted,
    },
    categoryTotal: {
      ...typography.meta,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    rowCard: {
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    firstRow: {
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    lastRow: {
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
    },
  });
