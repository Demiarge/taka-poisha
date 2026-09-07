import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { MonthSummary } from '@/types/transaction';
import { formatAmount } from '@/utils/format';

type BalanceCardProps = {
  /** e.g. "October 2026" */
  title: string;
  summary: MonthSummary;
};

/** The month's remaining balance, with total income and expenses below it. */
export function BalanceCard({ title, summary }: BalanceCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title} · Remaining</Text>
      <Text style={[styles.remaining, summary.remaining < 0 && styles.overspent]}>
        {formatAmount(summary.remaining)}
      </Text>
      <View style={styles.totals}>
        <Total label="Income" amount={summary.income} color={colors.income} />
        <Total label="Expenses" amount={summary.expenses} color={colors.expense} />
      </View>
    </View>
  );
}

type TotalProps = {
  label: string;
  amount: number;
  color: string;
};

function Total({ label, amount, color }: TotalProps) {
  return (
    <View style={styles.total}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.totalAmount, { color }]}>{formatAmount(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  remaining: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
  },
  overspent: {
    color: colors.expense,
  },
  totals: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  total: {
    flex: 1,
    gap: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
});
