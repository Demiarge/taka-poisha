import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography, type ThemeColors } from '@/constants/theme';
import { useColors, useThemedStyles } from '@/hooks/useTheme';
import type { Transaction } from '@/types/transaction';
import { formatAmount, formatDate } from '@/utils/format';

/** Hex alpha suffix: 2E is about 18% opacity. */
const ICON_BACKGROUND_OPACITY = '2E';

type TransactionRowProps = {
  transaction: Transaction;
  showCategory?: boolean;
};

/** One transaction in a list. Tapping it opens the Edit screen. */
export function TransactionRow({ transaction, showCategory = true }: TransactionRowProps) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  const isIncome = transaction.type === 'income';
  const date = formatDate(transaction.date);
  const details = [showCategory && transaction.category, transaction.shop, date].filter(Boolean).join(' · ');
  const sign = isIncome ? '+' : '−';
  const amount = formatAmount(transaction.amount, transaction.currency);
  const typeColor = colors[transaction.type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isIncome ? 'Income' : 'Expense'}: ${transaction.item}, ${amount}, ${transaction.category}, ${date}`}
      accessibilityHint="Opens this transaction to edit or delete it"
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: `${typeColor}${ICON_BACKGROUND_OPACITY}` }]}>
        <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={20} color={typeColor} />
      </View>
      <View style={styles.text}>
        <Text style={styles.item} numberOfLines={1}>
          {transaction.item}
        </Text>
        <Text style={styles.details} numberOfLines={1}>
          {details}
        </Text>
      </View>
      <Text style={[styles.amount, isIncome && { color: colors.income }]}>
        {sign}
        {amount}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    pressed: {
      backgroundColor: colors.surfacePressed,
    },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      flex: 1,
      gap: 2,
    },
    item: {
      ...typography.item,
      color: colors.text,
    },
    details: {
      ...typography.meta,
      color: colors.textMuted,
    },
    amount: {
      ...typography.amount,
      color: colors.text,
    },
  });
