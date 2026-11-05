import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalanceCard } from '@/components/BalanceCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { TransactionRow } from '@/components/TransactionRow';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import { useTransactions } from '@/hooks/useTransactions';
import { formatMonth, toIsoDate } from '@/utils/format';
import { summariseMonth } from '@/utils/monthSummary';

const RECENT_COUNT = 5;

export default function HomeScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const transactions = useTransactions();
  const currentMonth = toIsoDate(new Date()).slice(0, 7); // "YYYY-MM"

  // Wait for the first load so the balance doesn't flash ৳0.
  if (!transactions) {
    return <View style={styles.screen} />;
  }

  const summary = summariseMonth(transactions, currentMonth);
  const recent = transactions.slice(0, RECENT_COUNT);

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
        {recent.length === 0 ? (
          <EmptyState message="Nothing here yet. Add your first transaction." />
        ) : (
          recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.gutter,
      gap: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    sectionTitle: {
      ...typography.subsection,
      color: colors.text,
    },
    link: {
      ...typography.meta,
      color: colors.accent,
    },
    list: {
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
  });
