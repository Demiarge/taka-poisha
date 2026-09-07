import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalanceCard } from '@/components/BalanceCard';
import { Button } from '@/components/Button';
import { TransactionRow } from '@/components/TransactionRow';
import { colors, spacing } from '@/constants/theme';
import { SAMPLE_TRANSACTIONS } from '@/data/sampleTransactions';
import { formatMonth, toIsoDate } from '@/utils/format';
import { summariseMonth } from '@/utils/monthSummary';

const RECENT_COUNT = 5;

export default function HomeScreen() {
  const router = useRouter();
  const currentMonth = toIsoDate(new Date()).slice(0, 7); // "YYYY-MM"
  const summary = summariseMonth(SAMPLE_TRANSACTIONS, currentMonth);
  const recent = SAMPLE_TRANSACTIONS.slice(0, RECENT_COUNT);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BalanceCard title={formatMonth(currentMonth)} summary={summary} />

      <Button title="Add transaction" onPress={() => router.push('/add-transaction')} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent</Text>
        <Link href="/history" style={styles.link}>
          See all
        </Link>
      </View>

      <View style={styles.list}>
        {recent.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  link: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  list: {
    gap: spacing.sm,
  },
});
