import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hero, radius, spacing, typography } from '@/constants/theme';
import type { MonthSummary } from '@/types/transaction';
import { formatAmount } from '@/utils/format';

type BalanceCardProps = {
  title: string;
  summary: MonthSummary;
};

/** The month's remaining balance, with total income and expenses below it. */
export function BalanceCard({ title, summary }: BalanceCardProps) {
  // Red wouldn't be readable on the green card, so the label carries the warning.
  const status = summary.remaining < 0 ? 'Overspent' : 'Remaining';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {title} · {status}
      </Text>
      <Text style={styles.remaining}>{formatAmount(summary.remaining)}</Text>
      <View style={styles.totals}>
        <Total label="Income" amount={summary.income} icon="arrow-down" />
        <Total label="Expenses" amount={summary.expenses} icon="arrow-up" />
      </View>
    </View>
  );
}

type TotalProps = {
  label: string;
  amount: number;
  icon: ComponentProps<typeof Ionicons>['name'];
};

function Total({ label, amount, icon }: TotalProps) {
  return (
    <View style={styles.total}>
      <View style={styles.totalLabel}>
        <Ionicons name={icon} size={14} color={hero.textMuted} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.totalAmount}>{formatAmount(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: hero.background,
    backgroundImage: hero.gradient,
    borderRadius: radius.lg,
    padding: spacing.gutter,
    gap: spacing.xs,
  },
  label: {
    ...typography.meta,
    color: hero.textMuted,
  },
  remaining: {
    ...typography.balance,
    color: hero.text,
  },
  totals: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hero.divider,
  },
  total: {
    flex: 1,
    gap: 2,
  },
  totalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalAmount: {
    ...typography.amount,
    fontSize: 16,
    color: hero.text,
  },
});
