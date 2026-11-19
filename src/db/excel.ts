import type { SQLiteDatabase } from 'expo-sqlite';

import { assignMissingColours } from '@/db/categories';
import {
  noCase,
  rangeBounds,
  type CategoryName,
  type ExcelRow,
  type ExistingRow,
  type ExportRange,
  type ImportPlan,
} from '@/utils/excel';

/** Rows per INSERT: 8 bound values each, well under SQLite's limit. */
const INSERT_BATCH = 200;

/** Newest first, like the app's lists. */
export function listExportRows(db: SQLiteDatabase, range: ExportRange): Promise<ExcelRow[]> {
  const bounds = rangeBounds(range);
  return db.getAllAsync<ExcelRow>(
    `SELECT t.date, t.type, t.amount, t.item, t.shop, c.name AS category, t.source
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     ${bounds ? 'WHERE t.date BETWEEN ? AND ?' : ''}
     ORDER BY t.date DESC, t.id DESC`,
    ...(bounds ? [bounds.from, bounds.to] : []),
  );
}

/** What the file is checked against: transactions in its date span, and every category. */
export async function loadImportContext(
  db: SQLiteDatabase,
  rows: ExcelRow[],
): Promise<{ existing: ExistingRow[]; categories: CategoryName[] }> {
  const dates = rows.map((row) => row.date).sort();
  const existing =
    dates.length === 0
      ? []
      : await db.getAllAsync<ExistingRow>(
          'SELECT date, type, amount, item, shop FROM transactions WHERE date BETWEEN ? AND ?',
          dates[0],
          dates[dates.length - 1],
        );
  const categories = await db.getAllAsync<CategoryName>('SELECT name, type FROM categories');
  return { existing, categories };
}

/**
 * All or nothing. Categories get colours now; their MiniLM vectors are worked out the first time
 * category matching needs them, like any new category, so the model isn't loaded here.
 */
export async function insertImport(db: SQLiteDatabase, plan: ImportPlan): Promise<number> {
  const createdAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const category of plan.newCategories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (name, type, created_at) VALUES (?, ?, ?)',
        category.name,
        category.type,
        createdAt,
      );
    }
    if (plan.newCategories.length > 0) {
      await assignMissingColours(db);
    }
    const ids = new Map<string, number>();
    for (const row of await db.getAllAsync<{ id: number; name: string; type: string }>(
      'SELECT id, name, type FROM categories',
    )) {
      ids.set(`${row.type}|${noCase(row.name)}`, row.id);
    }

    for (let start = 0; start < plan.fresh.length; start += INSERT_BATCH) {
      const batch = plan.fresh.slice(start, start + INSERT_BATCH);
      const values: (string | number | null)[] = [];
      for (const row of batch) {
        const categoryId = ids.get(`${row.type}|${noCase(row.category)}`);
        if (categoryId === undefined) {
          throw new Error(`Category "${row.category}" could not be saved`);
        }
        values.push(row.type, row.amount, row.item, row.shop, categoryId, row.date, row.source, createdAt);
      }
      await db.runAsync(
        `INSERT INTO transactions
           (type, amount, currency, item, shop, category_id, date, source, raw_input, created_at)
         VALUES ${batch.map(() => "(?, ?, 'BDT', ?, ?, ?, ?, ?, NULL, ?)").join(', ')}`,
        values,
      );
    }
  });
  return plan.fresh.length;
}
