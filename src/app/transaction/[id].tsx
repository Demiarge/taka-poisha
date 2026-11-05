import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { TransactionForm } from '@/components/TransactionForm';
import { deleteTransaction, getTransaction, updateTransaction } from '@/db/transactions';
import type { Transaction, TransactionFields } from '@/types/transaction';

/** Edit or delete a saved transaction. */
export default function EditTransactionScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);

  // undefined = still loading, null = not found.
  const [transaction, setTransaction] = useState<Transaction | null | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    getTransaction(db, transactionId)
      .catch(() => null)
      .then((row) => {
        if (isCurrent) {
          setTransaction(row);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [db, transactionId]);

  async function handleSave(fields: TransactionFields) {
    await updateTransaction(db, transactionId, fields);
    router.back();
  }

  async function handleDelete() {
    try {
      await deleteTransaction(db, transactionId);
      router.back();
    } catch {
      Alert.alert('Could not delete', 'Your transaction was not deleted. Please try again.');
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this transaction?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  }

  if (transaction === undefined) {
    return null;
  }
  if (transaction === null) {
    return <EmptyState message="This transaction could not be found." />;
  }

  return (
    <TransactionForm
      initialValues={{
        type: transaction.type,
        amount: String(transaction.amount),
        item: transaction.item,
        shop: transaction.shop ?? '',
        date: transaction.date,
        category: transaction.category,
      }}
      submitTitle="Save changes"
      onSubmit={handleSave}
    >
      <Button title="Delete" variant="danger" onPress={confirmDelete} />
    </TransactionForm>
  );
}
