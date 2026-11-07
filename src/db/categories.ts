import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_PROMPT_CATEGORIES, UNCATEGORISED, type CategoryLists } from '@/constants/model';
import type { TransactionType } from '@/types/transaction';

/** Categories for the model's prompt: most used first, then oldest first, so a new user gets the starter order. */
export async function listPromptCategories(db: SQLiteDatabase): Promise<CategoryLists> {
  const rows = await db.getAllAsync<{ name: string; type: TransactionType }>(
    `SELECT c.name, c.type
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id
     WHERE c.name <> ?
     GROUP BY c.id
     ORDER BY COUNT(t.id) DESC, c.id`,
    UNCATEGORISED,
  );
  const lists: CategoryLists = { expense: [], income: [] };
  for (const row of rows) {
    if (lists[row.type].length < MAX_PROMPT_CATEGORIES[row.type]) {
      lists[row.type].push(row.name);
    }
  }
  return lists;
}
