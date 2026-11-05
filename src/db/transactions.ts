import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewTransaction, Transaction, TransactionFields, TransactionType } from '@/types/transaction';

const SELECT_TRANSACTIONS = `
  SELECT t.id, t.type, t.amount, t.currency, t.item, t.shop, c.name AS category, t.date
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

/** Newest first; within a day, the most recently added comes first. */
export function listTransactions(db: SQLiteDatabase): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(`${SELECT_TRANSACTIONS} ORDER BY t.date DESC, t.id DESC`);
}

export function getTransaction(db: SQLiteDatabase, id: number): Promise<Transaction | null> {
  return db.getFirstAsync<Transaction>(`${SELECT_TRANSACTIONS} WHERE t.id = ?`, id);
}

/** Not in a transaction with the save: a failed save leaves at worst an unused category. */
async function resolveCategoryId(db: SQLiteDatabase, name: string, type: TransactionType): Promise<number> {
  await db.runAsync(
    'INSERT OR IGNORE INTO categories (name, type, created_at) VALUES (?, ?, ?)',
    name,
    type,
    new Date().toISOString(),
  );
  const category = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE name = ? AND type = ?',
    name,
    type,
  );
  if (!category) {
    throw new Error(`Category "${name}" could not be saved`);
  }
  return category.id;
}

export async function addTransaction(db: SQLiteDatabase, transaction: NewTransaction): Promise<number> {
  const categoryId = await resolveCategoryId(db, transaction.category, transaction.type);
  const result = await db.runAsync(
    `INSERT INTO transactions
       (type, amount, currency, item, shop, category_id, date, source, raw_input, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    transaction.type,
    transaction.amount,
    transaction.currency,
    transaction.item,
    transaction.shop,
    categoryId,
    transaction.date,
    transaction.source,
    transaction.rawInput,
    new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

/** Leaves currency, source and the original input as they were saved. */
export async function updateTransaction(db: SQLiteDatabase, id: number, fields: TransactionFields): Promise<void> {
  const categoryId = await resolveCategoryId(db, fields.category, fields.type);
  await db.runAsync(
    `UPDATE transactions
     SET type = ?, amount = ?, item = ?, shop = ?, category_id = ?, date = ?
     WHERE id = ?`,
    fields.type,
    fields.amount,
    fields.item,
    fields.shop,
    categoryId,
    fields.date,
    id,
  );
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}
