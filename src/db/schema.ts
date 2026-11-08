import type { SQLiteDatabase } from 'expo-sqlite';

import { STARTER_CATEGORIES } from '@/constants/model';

const TRANSACTIONS_TABLE = (name: string) => `
  CREATE TABLE ${name} (
    id           INTEGER PRIMARY KEY,
    type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount       REAL NOT NULL CHECK (amount > 0),
    currency     TEXT NOT NULL DEFAULT 'BDT',
    item         TEXT NOT NULL,
    shop         TEXT,
    category_id  INTEGER NOT NULL,
    date         TEXT NOT NULL,
    source       TEXT NOT NULL CHECK (source IN ('text', 'receipt_local', 'receipt_api')),
    raw_input    TEXT,
    embedding    BLOB,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (category_id, type) REFERENCES categories (id, type)
  );
`;

const DATE_INDEX = 'CREATE INDEX idx_transactions_date ON transactions (date DESC, id DESC);';

// Category `embedding` holds MiniLM vectors for matching; the transactions column is unused.
// UNIQUE (id, type) backs the two-column FK, which makes a category's type match its transaction's.
const CREATE_TABLES = `
  CREATE TABLE categories (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL COLLATE NOCASE,
    type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    embedding   BLOB,
    created_at  TEXT NOT NULL,
    UNIQUE (name, type),
    UNIQUE (id, type)
  );
  ${TRANSACTIONS_TABLE('transactions')}
  ${DATE_INDEX}
`;

const DATABASE_VERSION = 3;

/** The model's prompt needs a category list, so a new database starts with the list it was trained on. */
async function seedStarterCategories(db: SQLiteDatabase): Promise<void> {
  const createdAt = new Date().toISOString();
  for (const type of ['expense', 'income'] as const) {
    for (const name of STARTER_CATEGORIES[type]) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (name, type, created_at) VALUES (?, ?, ?)',
        name,
        type,
        createdAt,
      );
    }
  }
}

/**
 * Version 3 renames the photo-sent-to-an-API source to 'receipt_api'. SQLite can't change a CHECK rule,
 * so the table is copied; nothing references transactions, so foreign keys can stay on.
 */
async function renameApiSource(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ${TRANSACTIONS_TABLE('transactions_v3')}
    INSERT INTO transactions_v3
      SELECT id, type, amount, currency, item, shop, category_id, date,
             CASE WHEN source IN ('text', 'receipt_local') THEN source ELSE 'receipt_api' END,
             raw_input, embedding, created_at
      FROM transactions;
    DROP TABLE transactions;
    ALTER TABLE transactions_v3 RENAME TO transactions;
    ${DATE_INDEX}
  `);
}

/** Runs when the database opens: applies settings, then any missing migrations. */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  // foreign_keys resets on every connection, and neither PRAGMA can change inside a transaction.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  await db.withTransactionAsync(async () => {
    if (currentVersion < 1) {
      await db.execAsync(CREATE_TABLES);
    }
    if (currentVersion < 2) {
      await seedStarterCategories(db);
    }
    // A fresh database already has the new rule.
    if (currentVersion >= 1 && currentVersion < 3) {
      await renameApiSource(db);
    }
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}
