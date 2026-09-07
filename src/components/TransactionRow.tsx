import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { formatAmount, formatDate } from '@/utils/format';

type TransactionRowProps = {
  transaction: Transaction;
};

export function TransactionRow({ transaction }: TransactionRowProps) {
  const details = [transaction.category, transaction.shop, formatDate(transaction.date)].filter(Boolean).join(' · ');
  // The +/− sign means the colour isn't the only clue (helps colour-blind users).
  const sign = transaction.type === 'income' ? '+' : '−';

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.item} numberOfLines={1}>
          {transaction.item}
        </Text>
        <Text style={styles.details} numberOfLines={1}>
          {details}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors[transaction.type] }]}>
        {sign}
        {formatAmount(transaction.amount, transaction.currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  item: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  details: {
    fontSize: 13,
    color: colors.textMuted,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
