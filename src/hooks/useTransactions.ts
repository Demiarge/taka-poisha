import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listTransactions } from '@/db/transactions';
import type { Transaction } from '@/types/transaction';

/** All saved transactions, reloaded on screen focus. Null until the first load finishes. */
export function useTransactions(): Transaction[] | null {
  const db = useSQLiteContext();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      listTransactions(db)
        .then((rows) => {
          if (isCurrent) {
            setTransactions(rows);
          }
        })
        .catch((error: unknown) => {
          // Throwing in setState reaches the router's error screen; an empty list would look like data loss.
          setTransactions(() => {
            throw error;
          });
        });
      return () => {
        isCurrent = false;
      };
    }, [db]),
  );

  return transactions;
}
