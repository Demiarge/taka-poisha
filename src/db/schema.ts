import type { SQLiteDatabase } from 'expo-sqlite';

import { STARTER_CATEGORIES } from '@/constants/model';

// `embedding` stays empty until similarity matching is added.
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

  CREATE TABLE transactions (
    id           INTEGER PRIMARY KEY,
    type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount       REAL NOT NULL CHECK (amount > 0),
    currency     TEXT NOT NULL DEFAULT 'BDT',
    item         TEXT NOT NULL,
    shop         TEXT,
    category_id  INTEGER NOT NULL,
    date         TEXT NOT NULL,
    source       TEXT NOT NULL CHECK (source IN ('text', 'receipt_local', 'receipt_gemini')),
    raw_input    TEXT,
    embedding    BLOB,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (category_id, type) REFERENCES categories (id, type)
  );

  CREATE INDEX idx_transactions_date ON transactions (date DESC, id DESC);
`;

const DATABASE_VERSION = 2;

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
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}
