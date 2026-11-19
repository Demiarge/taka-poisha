import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import type { SavedColour } from '@/constants/theme';
import { listCategoryColours, setCategoryColour, type CategoryColourEntry } from '@/db/categories';
import type { TransactionType } from '@/types/transaction';

/** Saved category colours, reloaded on focus, and a setter that updates them straight away. */
export function useCategoryColours() {
  const db = useSQLiteContext();
  const [colours, setColours] = useState<Map<string, CategoryColourEntry>>(new Map());

  const reload = useCallback(() => {
    let isCurrent = true;
    listCategoryColours(db)
      .then((map) => {
        if (isCurrent) {
          setColours(map);
        }
      })
      .catch(() => {
        // Without saved colours the chart falls back to palette order, so it still draws.
      });
    return () => {
      isCurrent = false;
    };
  }, [db]);

  useFocusEffect(reload);

  const changeColour = useCallback(
    async (type: TransactionType, name: string, colour: SavedColour) => {
      await setCategoryColour(db, type, name, colour);
      reload();
    },
    [db, reload],
  );

  return { colours, changeColour };
}
