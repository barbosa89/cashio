import type { SQLiteDatabase } from 'expo-sqlite';

export type CategoryType = 'income' | 'expense' | 'both';
export type TransactionType = 'income' | 'expense';

export type Category = {
  id: number;
  description: string;
  type: CategoryType | null;
  created_at: string;
  updated_at: string;
  transaction_count: number;
};

export type Tag = {
  id: number;
  description: string;
  created_at: string;
  updated_at: string;
  transaction_count: number;
};

export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  transaction_date: string;
  category_id: number;
  category_description: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

export type MonthlySummaryRow = {
  month: string;
  income_total: number;
  expense_total: number;
  net_total: number;
  transaction_count: number;
  updated_at: string;
};

export type SettingValueType = 'boolean' | 'number' | 'string' | 'json';

export type SettingRow = {
  key: string;
  value: string;
  value_type: SettingValueType;
  created_at: string;
  updated_at: string;
};

const DATABASE_VERSION = 3;

const DEFAULT_CATEGORIES: Array<{ description: string; type: CategoryType }> = [
  { description: 'Alimentación', type: 'expense' },
  { description: 'Transporte', type: 'expense' },
  { description: 'Vivienda', type: 'expense' },
  { description: 'Servicios', type: 'expense' },
  { description: 'Salud', type: 'expense' },
  { description: 'Educación', type: 'expense' },
  { description: 'Entretenimiento', type: 'expense' },
  { description: 'Compras', type: 'expense' },
  { description: 'Deudas', type: 'expense' },
  { description: 'Ahorro', type: 'expense' },
  { description: 'Salario', type: 'income' },
  { description: 'Freelance', type: 'income' },
  { description: 'Inversiones', type: 'income' },
  { description: 'Regalos', type: 'income' },
  { description: 'Otros ingresos', type: 'income' },
  { description: 'Transferencias', type: 'both' },
  { description: 'Ajustes', type: 'both' },
];

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = versionResult?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL COLLATE NOCASE UNIQUE,
        type TEXT NULL CHECK(type IN ('income', 'expense', 'both')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL COLLATE NOCASE UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        amount REAL NOT NULL CHECK(amount > 0),
        description TEXT NULL,
        transaction_date TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS transaction_tags (
        transaction_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY(transaction_id, tag_id),
        FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_categories_description ON categories(description);
      CREATE INDEX IF NOT EXISTS idx_tags_description ON tags(description);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);
    `);

    const now = new Date().toISOString();
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (description, type, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        category.description,
        category.type,
        now,
        now
      );
    }

    currentDbVersion = 1;
  }

  if (currentDbVersion === 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        value_type TEXT NOT NULL CHECK(value_type IN ('boolean', 'number', 'string', 'json')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value, value_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      'accumulate_previous_balances',
      'false',
      'boolean',
      now,
      now
    );

    currentDbVersion = 2;
  }

  if (currentDbVersion === 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS monthly_summaries (
        month TEXT PRIMARY KEY,
        income_total REAL NOT NULL,
        expense_total REAL NOT NULL,
        net_total REAL NOT NULL,
        transaction_count INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    await db.runAsync(
      `
        INSERT OR REPLACE INTO monthly_summaries
          (month, income_total, expense_total, net_total, transaction_count, updated_at)
        SELECT
          substr(transaction_date, 1, 7) AS month,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income_total,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense_total,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_total,
          COUNT(*) AS transaction_count,
          ? AS updated_at
        FROM transactions
        GROUP BY substr(transaction_date, 1, 7)
      `,
      now
    );

    currentDbVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
