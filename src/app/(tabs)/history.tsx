import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import { useTransactions } from '@/hooks/useTransactions';
import { formatAmount, formatMonth } from '@/utils/format';
import { groupTransactions } from '@/utils/groupTransactions';

/** Every transaction, grouped by month and then by category. */
export default function HistoryScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const transactions = useTransactions();
  const sections = useMemo(() => groupTransactions(transactions ?? []), [transactions]);

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(transaction) => String(transaction.id)}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={transactions ? <EmptyState message="Nothing here yet." /> : undefined}
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
