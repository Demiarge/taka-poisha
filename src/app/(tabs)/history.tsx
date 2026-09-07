import { FlatList, StyleSheet } from 'react-native';

import { TransactionRow } from '@/components/TransactionRow';
import { colors, spacing } from '@/constants/theme';
import { SAMPLE_TRANSACTIONS } from '@/data/sampleTransactions';

export default function HistoryScreen() {
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={SAMPLE_TRANSACTIONS}
      keyExtractor={(transaction) => String(transaction.id)}
      renderItem={({ item }) => <TransactionRow transaction={item} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
