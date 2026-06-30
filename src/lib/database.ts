import type { SQLiteDatabase } from 'expo-sqlite';

export type CategoryType = 'income' | 'expense' | 'both';
export type TransactionType = 'income' | 'expense';
export type AccountScope = number | 'all';

export type Account = {
  id: number;
  name: string;
  initial_balance: number;
  is_default: number;
  is_archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  has_transactions: number;
};

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
  account_id: number;
  account_name: string;
  category_id: number;
  category_description: string;
  is_transfer: number;
  transfer_group_id: string | null;
  transfer_peer_account_id: number | null;
  transfer_peer_account_name: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
};

export type MonthlySummaryRow = {
  account_id: number;
  month: string;
  income_total: number;
  expense_total: number;
  transfer_in_total: number;
  transfer_out_total: number;
  net_total: number;
  transaction_count: number;
  updated_at: string;
};

export type MonthlyBudgetAllocation = {
  id: number;
  account_id: number;
  month: string;
  category_id: number;
  planned_amount: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyBudgetItem = {
  allocation_id: number;
  category_id: number;
  category_description: string;
  category_type: CategoryType | null;
  planned_amount: number;
  spent_amount: number;
  remaining_amount: number;
};

export type MonthlyBudgetAvailableCategory = {
  category_id: number;
  category_description: string;
  category_type: CategoryType | null;
};

export type MonthlyBudgetUnbudgetedExpense = {
  category_id: number;
  category_description: string;
  category_type: CategoryType | null;
  spent_amount: number;
};

export type MonthlyBudgetSummary = {
  planned_total: number;
  spent_total: number;
  remaining_total: number;
  unbudgeted_expense_total: number;
};

export type MonthlyBudgetData = {
  accountScope: AccountScope;
  items: MonthlyBudgetItem[];
  availableCategories: MonthlyBudgetAvailableCategory[];
  unbudgetedExpenses: MonthlyBudgetUnbudgetedExpense[];
  summary: MonthlyBudgetSummary;
};

export type AccountBalanceRow = {
  account_id: number;
  account_name: string;
  is_default: number;
  initial_balance: number;
  income_total: number;
  expense_total: number;
  transfer_in_total: number;
  transfer_out_total: number;
  month_net_total: number;
  balance_total: number;
};

export type SettingValueType = 'boolean' | 'number' | 'string' | 'json';

export type SettingRow = {
  key: string;
  value: string;
  value_type: SettingValueType;
  created_at: string;
  updated_at: string;
};

const DATABASE_VERSION = 6;

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

  if (currentDbVersion === 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS monthly_budget_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        planned_amount REAL NOT NULL CHECK(planned_amount > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(month, category_id),
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_monthly_budget_allocations_month
        ON monthly_budget_allocations(month);
      CREATE INDEX IF NOT EXISTS idx_monthly_budget_allocations_category_id
        ON monthly_budget_allocations(category_id);
    `);

    currentDbVersion = 4;
  }

  if (currentDbVersion === 4) {
    await db.execAsync(`
      DROP TABLE IF EXISTS monthly_budget_allocations_v5;

      CREATE TABLE monthly_budget_allocations_v5 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        planned_amount REAL NOT NULL CHECK(planned_amount >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(month, category_id),
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      INSERT INTO monthly_budget_allocations_v5
        (id, month, category_id, planned_amount, created_at, updated_at)
      SELECT
        id,
        month,
        category_id,
        planned_amount,
        created_at,
        updated_at
      FROM monthly_budget_allocations;

      DROP TABLE monthly_budget_allocations;
      ALTER TABLE monthly_budget_allocations_v5 RENAME TO monthly_budget_allocations;

      CREATE INDEX IF NOT EXISTS idx_monthly_budget_allocations_month
        ON monthly_budget_allocations(month);
      CREATE INDEX IF NOT EXISTS idx_monthly_budget_allocations_category_id
        ON monthly_budget_allocations(category_id);
    `);

    currentDbVersion = 5;
  }

  if (currentDbVersion === 5) {
    const now = new Date().toISOString();
    const escapedNow = now.replaceAll("'", "''");

    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.execAsync(`
      DROP TABLE IF EXISTS monthly_budget_allocations_v6;
      DROP TABLE IF EXISTS monthly_summaries_v6;
      DROP TABLE IF EXISTS transactions_v6;

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        initial_balance REAL NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
        is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0, 1)),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.runAsync(
      `INSERT OR IGNORE INTO accounts
        (id, name, initial_balance, is_default, is_archived, sort_order, created_at, updated_at)
       VALUES (1, 'Principal', 0, 1, 0, 0, ?, ?)`,
      now,
      now
    );

    await db.execAsync(`
      UPDATE accounts
      SET is_default = CASE WHEN id = 1 THEN 1 ELSE 0 END,
          updated_at = '${escapedNow}';

      CREATE TABLE transactions_v6 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        amount REAL NOT NULL CHECK(amount > 0),
        description TEXT NULL,
        transaction_date TEXT NOT NULL,
        account_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        is_transfer INTEGER NOT NULL DEFAULT 0 CHECK(is_transfer IN (0, 1)),
        transfer_group_id TEXT NULL,
        transfer_peer_account_id INTEGER NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY(transfer_peer_account_id) REFERENCES accounts(id) ON DELETE SET NULL
      );

      INSERT INTO transactions_v6
        (
          id,
          type,
          amount,
          description,
          transaction_date,
          account_id,
          category_id,
          is_transfer,
          transfer_group_id,
          transfer_peer_account_id,
          created_at,
          updated_at
        )
      SELECT
        id,
        type,
        amount,
        description,
        transaction_date,
        1,
        category_id,
        0,
        NULL,
        NULL,
        created_at,
        updated_at
      FROM transactions;

      DROP TABLE transactions;
      ALTER TABLE transactions_v6 RENAME TO transactions;

      CREATE TABLE monthly_summaries_v6 (
        account_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        income_total REAL NOT NULL,
        expense_total REAL NOT NULL,
        transfer_in_total REAL NOT NULL DEFAULT 0,
        transfer_out_total REAL NOT NULL DEFAULT 0,
        net_total REAL NOT NULL,
        transaction_count INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(account_id, month),
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );

      INSERT INTO monthly_summaries_v6
        (
          account_id,
          month,
          income_total,
          expense_total,
          transfer_in_total,
          transfer_out_total,
          net_total,
          transaction_count,
          updated_at
        )
      SELECT
        1,
        month,
        income_total,
        expense_total,
        0,
        0,
        net_total,
        transaction_count,
        updated_at
      FROM monthly_summaries;

      DROP TABLE monthly_summaries;
      ALTER TABLE monthly_summaries_v6 RENAME TO monthly_summaries;

      CREATE TABLE monthly_budget_allocations_v6 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        planned_amount REAL NOT NULL CHECK(planned_amount >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(account_id, month, category_id),
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      INSERT INTO monthly_budget_allocations_v6
        (id, account_id, month, category_id, planned_amount, created_at, updated_at)
      SELECT
        id,
        1,
        month,
        category_id,
        planned_amount,
        created_at,
        updated_at
      FROM monthly_budget_allocations;

      DROP TABLE monthly_budget_allocations;
      ALTER TABLE monthly_budget_allocations_v6 RENAME TO monthly_budget_allocations;

      CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group_id ON transactions(transfer_group_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_month_account
        ON transactions(account_id, transaction_date);
      CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month
        ON monthly_summaries(month);
      CREATE INDEX IF NOT EXISTS idx_monthly_budget_allocations_account_month
        ON monthly_budget_allocations(account_id, month);
      CREATE INDEX IF NOT EXISTS idx_monthly_budget_allocations_category_id
        ON monthly_budget_allocations(category_id);
    `);

    await db.execAsync('PRAGMA foreign_keys = ON;');
    const foreignKeyCheck = await db.getAllAsync<{
      table: string;
      rowid: number;
      parent: string;
      fkid: number;
    }>('PRAGMA foreign_key_check;');
    if (foreignKeyCheck.length > 0) {
      throw new Error('La migración de cuentas dejó referencias inválidas.');
    }

    currentDbVersion = 6;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
