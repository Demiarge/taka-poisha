import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_PROMPT_CATEGORIES, UNCATEGORISED, type CategoryLists } from '@/constants/model';
import type { TransactionType } from '@/types/transaction';

/** Case-insensitive, like the database's NOCASE names. */
export function hasCategory(names: string[], name: string): boolean {
  return names.some((other) => other.toLowerCase() === name.trim().toLowerCase());
}

/** Category names by type, most used first, then oldest first, so a new user gets the starter order. */
export async function listCategories(
  db: SQLiteDatabase,
  limits?: Record<TransactionType, number>,
): Promise<CategoryLists> {
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
    if (!limits || lists[row.type].length < limits[row.type]) {
      lists[row.type].push(row.name);
    }
  }
  return lists;
}

/** The lists for the model's prompt, capped so it stays short. */
export function listPromptCategories(db: SQLiteDatabase): Promise<CategoryLists> {
  return listCategories(db, MAX_PROMPT_CATEGORIES);
}
