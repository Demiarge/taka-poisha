import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';

import { TransactionForm } from '@/components/TransactionForm';
import { radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { addTransaction } from '@/db/transactions';
import { useThemedStyles } from '@/hooks/useTheme';
import type { CategoryNote, TransactionFields } from '@/types/transaction';

type ConfirmParams = {
  type?: string;
  amount?: string;
  item?: string;
  shop?: string;
  date?: string;
  category?: string;
  rawInput?: string;
  readBy?: string;
  otherCurrency?: string;
  typeOverridden?: string;
  categoryNote?: string;
};

function parseNote(json: string | undefined): CategoryNote | null {
  try {
    return json ? (JSON.parse(json) as CategoryNote) : null;
  } catch {
    return null;
  }
}

/** Shows the extracted details so the user can correct them before saving. */
export default function ConfirmScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<ConfirmParams>();

  const notices = [
    params.readBy === 'keywords' && "The AI couldn't read this, so check every field.",
    params.typeOverridden &&
      `Check this: it reads like ${params.type === 'income' ? 'an expense' : 'income'}, but you picked ${params.type}.`,
    params.otherCurrency &&
      `This mentions ${params.otherCurrency}. The app only tracks taka for now, so convert the amount to ৳ before saving.`,
  ].filter(Boolean);

  async function handleSave(fields: TransactionFields) {
    // Home adds every amount into one ৳ total, so everything is saved as BDT for now.
    await addTransaction(db, {
      ...fields,
      currency: 'BDT',
      source: 'text',
      rawInput: params.rawInput ?? null,
    });
    router.dismissAll();
  }

  return (
    <TransactionForm
      initialValues={{
        type: params.type === 'income' ? 'income' : 'expense',
        amount: params.amount ?? '',
        item: params.item ?? '',
        shop: params.shop ?? '',
        date: params.date ?? '',
        category: params.category ?? '',
      }}
      onSubmit={handleSave}
      categoryNote={parseNote(params.categoryNote)}
      header={
        <View style={styles.card}>
          {params.rawInput ? (
            <View style={styles.original}>
              <Text style={styles.label}>You wrote</Text>
              <Text style={styles.originalText} selectable>
                {params.rawInput}
              </Text>
            </View>
          ) : null}
          {notices.map((notice) => (
            <Text key={String(notice)} style={styles.noticeText}>
              {notice}
            </Text>
          ))}
        </View>
      }
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    original: {
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: colors.textMuted,
    },
    originalText: {
      ...typography.body,
      color: colors.text,
    },
    noticeText: {
      ...typography.meta,
      color: colors.warning,
    },
  });
