import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TypeToggle } from '@/components/TypeToggle';
import { spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import type { TransactionFields, TransactionType } from '@/types/transaction';
import { isValidIsoDate } from '@/utils/format';

const DEFAULT_CATEGORY = 'Uncategorised';

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  item: string;
  shop: string;
  date: string;
  category: string;
};

type TransactionFormProps = {
  initialValues: TransactionFormValues;
  submitTitle: string;
  /** Should leave the screen when it succeeds. If it throws, the form stays open. */
  onSubmit: (fields: TransactionFields) => Promise<void>;
  /** Shown above the fields. */
  header?: ReactNode;
  children?: ReactNode;
};

/** The transaction fields, shared by the Confirm and Edit screens. */
export function TransactionForm({ initialValues, submitTitle, onSubmit, header, children }: TransactionFormProps) {
  const styles = useThemedStyles(createStyles);

  const [type, setType] = useState(initialValues.type);
  const [amount, setAmount] = useState(initialValues.amount);
  const [item, setItem] = useState(initialValues.item);
  const [shop, setShop] = useState(initialValues.shop);
  const [date, setDate] = useState(initialValues.date);
  const [category, setCategory] = useState(initialValues.category);
  const [isSaving, setIsSaving] = useState(false);

  const parsedAmount = Number(amount);
  const trimmedDate = date.trim();
  const dateIsValid = isValidIsoDate(trimmedDate);
  const canSave = Number.isFinite(parsedAmount) && parsedAmount > 0 && item.trim() !== '' && dateIsValid;

  async function handleSubmit() {
    setIsSaving(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        item: item.trim(),
        shop: shop.trim() || null,
        date: trimmedDate,
        category: category.trim() || DEFAULT_CATEGORY,
      });
    } catch {
      Alert.alert('Could not save', 'Your transaction was not saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      <TypeToggle value={type} onChange={setType} />
      <FormField label="Amount (৳)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <FormField label="Item" value={item} onChangeText={setItem} />
      <FormField
        label={type === 'income' ? 'From' : 'Shop'}
        value={shop}
        onChangeText={setShop}
        placeholder="Optional"
      />
      <FormField
        label={dateIsValid ? 'Date' : 'Date (use YYYY-MM-DD)'}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
      />
      <FormField label="Category" value={category} onChangeText={setCategory} placeholder={DEFAULT_CATEGORY} />
      <Button title={isSaving ? 'Saving…' : submitTitle} onPress={handleSubmit} disabled={!canSave || isSaving} />
      {children}
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
  });
