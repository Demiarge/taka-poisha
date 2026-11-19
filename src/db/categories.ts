import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_PROMPT_CATEGORIES, UNCATEGORISED, type CategoryLists } from '@/constants/model';
import {
  CATEGORY_COLOURS,
  isCategoryColour,
  isSavedColour,
  type CategoryColour,
  type SavedColour,
} from '@/constants/theme';
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

/**
 * Gives each uncoloured category the colour least used by its type, in id order, so neighbours differ.
 * A custom hex counts as coloured, so it's never replaced.
 */
export async function assignMissingColours(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ id: number; type: TransactionType; color: string | null }>(
    'SELECT id, type, color FROM categories ORDER BY id',
  );
  const used: Record<TransactionType, Map<CategoryColour, number>> = { expense: new Map(), income: new Map() };
  for (const row of rows) {
    if (isCategoryColour(row.color)) {
      used[row.type].set(row.color, (used[row.type].get(row.color) ?? 0) + 1);
    }
  }
  for (const row of rows) {
    if (isSavedColour(row.color)) {
      continue;
    }
    const counts = used[row.type];
    // Ties go to palette order, which keeps the first colours far apart.
    const colour = CATEGORY_COLOURS.reduce((best, next) =>
      (counts.get(next) ?? 0) < (counts.get(best) ?? 0) ? next : best,
    );
    counts.set(colour, (counts.get(colour) ?? 0) + 1);
    await db.runAsync('UPDATE categories SET color = ? WHERE id = ?', colour, row.id);
  }
}

export type CategoryColourEntry = { name: string; type: TransactionType; colour: SavedColour };

/** Keyed by categoryColourKey(type, name). */
export async function listCategoryColours(db: SQLiteDatabase): Promise<Map<string, CategoryColourEntry>> {
  const rows = await db.getAllAsync<{ name: string; type: TransactionType; color: string | null }>(
    'SELECT name, type, color FROM categories',
  );
  const colours = new Map<string, CategoryColourEntry>();
  for (const row of rows) {
    if (isSavedColour(row.color)) {
      colours.set(categoryColourKey(row.type, row.name), { name: row.name, type: row.type, colour: row.color });
    }
  }
  return colours;
}

/** Names are NOCASE in the database, so the key is lower-cased. */
export function categoryColourKey(type: TransactionType, name: string): string {
  return `${type}|${name.toLowerCase()}`;
}

export async function setCategoryColour(
  db: SQLiteDatabase,
  type: TransactionType,
  name: string,
  colour: SavedColour,
): Promise<void> {
  if (!isSavedColour(colour)) {
    throw new Error(`Not a category colour: ${colour}`);
  }
  await db.runAsync('UPDATE categories SET color = ? WHERE name = ? AND type = ?', colour, name, type);
}
