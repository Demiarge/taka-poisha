import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TypeToggle } from '@/components/TypeToggle';
import { colors, spacing } from '@/constants/theme';
import type { TransactionType } from '@/types/transaction';

type ConfirmParams = {
  type?: string;
  amount?: string;
  item?: string;
  shop?: string;
  date?: string;
  category?: string;
};

/** Shows the extracted details so the user can correct them before saving. */
export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ConfirmParams>();

  // Params arrive as plain strings, so check the value instead of trusting it.
  const [type, setType] = useState<TransactionType>(params.type === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [item, setItem] = useState(params.item ?? '');
  const [shop, setShop] = useState(params.shop ?? '');
  const [date, setDate] = useState(params.date ?? '');
  const [category, setCategory] = useState(params.category ?? '');

  const canSave = Number(amount) > 0 && item.trim() !== '';

  function handleSave() {
    // Nothing is stored yet: saving to SQLite arrives in Step 2.
    const label = type === 'income' ? 'Income' : 'Expense';
    Alert.alert('Saved', `${label}: ${item}, ৳${amount} (not stored yet)`);
    router.dismissAll();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TypeToggle value={type} onChange={setType} />
      <FormField label="Amount (৳)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <FormField label="Item" value={item} onChangeText={setItem} />
      <FormField
        label={type === 'income' ? 'From' : 'Shop'}
        value={shop}
        onChangeText={setShop}
        placeholder="Optional"
      />
      <FormField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      <FormField label="Category" value={category} onChangeText={setCategory} />
      <Button title="Save" onPress={handleSave} disabled={!canSave} />
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
});
