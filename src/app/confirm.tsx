import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { TransactionForm } from '@/components/TransactionForm';
import { addTransaction } from '@/db/transactions';
import type { TransactionFields } from '@/types/transaction';

type ConfirmParams = {
  type?: string;
  amount?: string;
  item?: string;
  shop?: string;
  date?: string;
  category?: string;
  rawInput?: string;
};

/** Shows the extracted details so the user can correct them before saving. */
export default function ConfirmScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<ConfirmParams>();

  async function handleSave(fields: TransactionFields) {
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
      submitTitle="Save"
      onSubmit={handleSave}
    />
  );
}
