import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Account,
  AccountBalanceRow,
  AccountScope,
  Category,
  CategoryType,
  MonthlyBudgetAvailableCategory,
  MonthlyBudgetData,
  MonthlyBudgetItem,
  MonthlyBudgetSummary,
  MonthlyBudgetUnbudgetedExpense,
  MonthlySummaryRow,
  Tag,
  Transaction,
  TransactionType,
} from '@/lib/database';

export type SaveAccountInput = {
  initialBalance: number;
  name: string;
};

export type SaveCategoryInput = {
  description: string;
  type: CategoryType | null;
};

export type SaveTagInput = {
  description: string;
};

export type CreateTransactionInput = {
  accountId: number;
  amount: number;
  categoryId: number;
  description: string;
  destinationAccountId?: number | null;
  tagIds: number[];
  transactionDate: string;
  type: TransactionType;
};

export type SaveMonthlyBudgetAmountInput = {
  accountScope: AccountScope;
  categoryId: number;
  month: string;
  plannedAmount: number;
};

export class CashioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CashioValidationError';
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDescription(description: string) {
  return description.trim();
}

function isUniqueError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('unique');
}

function assertDescription(description: string, entity: 'cuenta' | 'categoría' | 'tag') {
  const normalized = normalizeDescription(description);
  if (!normalized) {
    const article = entity === 'tag' ? 'del' : 'de la';
    throw new CashioValidationError(`El nombre ${article} ${entity} no puede estar vacío.`);
  }
  return normalized;
}

function assertAmount(value: number, message: string) {
  if (!Number.isFinite(value)) {
    throw new CashioValidationError(message);
  }
  return value;
}

function getTransactionMonth(transactionDate: string) {
  return transactionDate.slice(0, 7);
}

function assertMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new CashioValidationError('El mes no es válido.');
  }
  return month;
}

function assertConcreteAccountScope(accountScope: AccountScope) {
  if (accountScope === 'all') {
    throw new CashioValidationError('Selecciona una cuenta específica.');
  }
  return accountScope;
}

function canBudgetCategory(type: CategoryType | null) {
  return type === null || type === 'expense' || type === 'both';
}

function createTransferGroupId() {
  return `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function assertAccountExists(db: SQLiteDatabase, accountId: number) {
  const account = await db.getFirstAsync<{ id: number; is_archived: number }>(
    'SELECT id, is_archived FROM accounts WHERE id = ?',
    accountId
  );

  if (!account || account.is_archived === 1) {
    throw new CashioValidationError('Selecciona una cuenta válida.');
  }
}

async function assertBudgetableCategory(db: SQLiteDatabase, categoryId: number) {
  const category = await db.getFirstAsync<{ id: number; type: CategoryType | null }>(
    'SELECT id, type FROM categories WHERE id = ?',
    categoryId
  );

  if (!category) {
    throw new CashioValidationError('Selecciona una categoría válida.');
  }

  if (!canBudgetCategory(category.type)) {
    throw new CashioValidationError('Solo las categorías de egreso pueden tener presupuesto.');
  }
}

export async function recalculateMonthlySummary(
  db: SQLiteDatabase,
  accountId: number,
  month: string
) {
  const summary = await db.getFirstAsync<{
    expense_total: number;
    income_total: number;
    net_total: number;
    transaction_count: number;
    transfer_in_total: number;
    transfer_out_total: number;
  }>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN is_transfer = 0 AND type = 'income' THEN amount ELSE 0 END), 0)
          AS income_total,
        COALESCE(SUM(CASE WHEN is_transfer = 0 AND type = 'expense' THEN amount ELSE 0 END), 0)
          AS expense_total,
        COALESCE(SUM(CASE WHEN is_transfer = 1 AND type = 'income' THEN amount ELSE 0 END), 0)
          AS transfer_in_total,
        COALESCE(SUM(CASE WHEN is_transfer = 1 AND type = 'expense' THEN amount ELSE 0 END), 0)
          AS transfer_out_total,
        COALESCE(SUM(
          CASE
            WHEN type = 'income' THEN amount
            ELSE -amount
          END
        ), 0) AS net_total,
        COUNT(*) AS transaction_count
      FROM transactions
      WHERE account_id = ?
        AND substr(transaction_date, 1, 7) = ?
    `,
    accountId,
    month
  );

  if (!summary || summary.transaction_count === 0) {
    await db.runAsync(
      'DELETE FROM monthly_summaries WHERE account_id = ? AND month = ?',
      accountId,
      month
    );
    return;
  }

  await db.runAsync(
    `
      INSERT INTO monthly_summaries
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, month) DO UPDATE SET
        income_total = excluded.income_total,
        expense_total = excluded.expense_total,
        transfer_in_total = excluded.transfer_in_total,
        transfer_out_total = excluded.transfer_out_total,
        net_total = excluded.net_total,
        transaction_count = excluded.transaction_count,
        updated_at = excluded.updated_at
    `,
    accountId,
    month,
    summary.income_total,
    summary.expense_total,
    summary.transfer_in_total,
    summary.transfer_out_total,
    summary.net_total,
    summary.transaction_count,
    nowIso()
  );
}

export async function listAccounts(db: SQLiteDatabase, includeArchived = false) {
  return db.getAllAsync<Account>(
    `
      SELECT
        accounts.id,
        accounts.name,
        accounts.initial_balance,
        accounts.is_default,
        accounts.is_archived,
        accounts.sort_order,
        accounts.created_at,
        accounts.updated_at,
        EXISTS (
          SELECT 1
          FROM transactions
          WHERE transactions.account_id = accounts.id
          LIMIT 1
        ) AS has_transactions
      FROM accounts
      WHERE (? = 1 OR accounts.is_archived = 0)
      ORDER BY accounts.sort_order ASC, accounts.name COLLATE NOCASE ASC
    `,
    includeArchived ? 1 : 0
  );
}

export async function createAccount(db: SQLiteDatabase, input: SaveAccountInput) {
  const name = assertDescription(input.name, 'cuenta');
  const initialBalance = assertAmount(input.initialBalance, 'El saldo inicial no es válido.');
  const timestamp = nowIso();
  const sortOrder = await db.getFirstAsync<{ sort_order: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS sort_order FROM accounts'
  );

  try {
    const result = await db.runAsync(
      `INSERT INTO accounts
        (name, initial_balance, is_default, is_archived, sort_order, created_at, updated_at)
       VALUES (?, ?, 0, 0, ?, ?, ?)`,
      name,
      initialBalance,
      sortOrder?.sort_order ?? 1,
      timestamp,
      timestamp
    );

    return db.getFirstAsync<Account>(
      `
        SELECT
          id,
          name,
          initial_balance,
          is_default,
          is_archived,
          sort_order,
          created_at,
          updated_at,
          0 AS has_transactions
        FROM accounts
        WHERE id = ?
      `,
      result.lastInsertRowId
    );
  } catch (error) {
    if (isUniqueError(error)) {
      throw new CashioValidationError('Ya existe una cuenta con ese nombre.');
    }
    throw error;
  }
}

export async function updateAccount(db: SQLiteDatabase, id: number, input: SaveAccountInput) {
  const name = assertDescription(input.name, 'cuenta');
  const initialBalance = assertAmount(input.initialBalance, 'El saldo inicial no es válido.');

  try {
    await db.runAsync(
      `
        UPDATE accounts
        SET name = ?, initial_balance = ?, updated_at = ?
        WHERE id = ?
      `,
      name,
      initialBalance,
      nowIso(),
      id
    );
  } catch (error) {
    if (isUniqueError(error)) {
      throw new CashioValidationError('Ya existe una cuenta con ese nombre.');
    }
    throw error;
  }
}

export async function deleteAccount(db: SQLiteDatabase, id: number) {
  const account = await db.getFirstAsync<{ is_default: number }>(
    'SELECT is_default FROM accounts WHERE id = ?',
    id
  );

  if (!account) {
    return;
  }

  if (account.is_default === 1) {
    throw new CashioValidationError('La cuenta principal no se puede eliminar.');
  }

  const usage = await db.getFirstAsync<{ has_transactions: number }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM transactions
        WHERE account_id = ?
        LIMIT 1
      ) AS has_transactions
    `,
    id
  );

  if ((usage?.has_transactions ?? 0) === 1) {
    throw new CashioValidationError('No se puede eliminar una cuenta asociada a registros.');
  }

  await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
}

export async function listCategories(db: SQLiteDatabase, search = '') {
  const like = `%${search.trim()}%`;
  return db.getAllAsync<Category>(
    `
      SELECT
        categories.id,
        categories.description,
        categories.type,
        categories.created_at,
        categories.updated_at,
        COUNT(transactions.id) AS transaction_count
      FROM categories
      LEFT JOIN transactions ON transactions.category_id = categories.id
      WHERE categories.description LIKE ? COLLATE NOCASE
      GROUP BY categories.id
      ORDER BY categories.description COLLATE NOCASE ASC
    `,
    like
  );
}

export async function listCategoriesForTransaction(
  db: SQLiteDatabase,
  transactionType: TransactionType,
  search = ''
) {
  const like = `%${search.trim()}%`;
  return db.getAllAsync<Category>(
    `
      SELECT
        categories.id,
        categories.description,
        categories.type,
        categories.created_at,
        categories.updated_at,
        COUNT(transactions.id) AS transaction_count
      FROM categories
      LEFT JOIN transactions ON transactions.category_id = categories.id
      WHERE categories.description LIKE ? COLLATE NOCASE
        AND (categories.type IS NULL OR categories.type = 'both' OR categories.type = ?)
      GROUP BY categories.id
      ORDER BY categories.description COLLATE NOCASE ASC
    `,
    like,
    transactionType
  );
}

export async function createCategory(db: SQLiteDatabase, input: SaveCategoryInput) {
  const description = assertDescription(input.description, 'categoría');
  const timestamp = nowIso();

  try {
    const result = await db.runAsync(
      `INSERT INTO categories (description, type, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      description,
      input.type,
      timestamp,
      timestamp
    );

    return db.getFirstAsync<Category>(
      `
        SELECT id, description, type, created_at, updated_at, 0 AS transaction_count
        FROM categories
        WHERE id = ?
      `,
      result.lastInsertRowId
    );
  } catch (error) {
    if (isUniqueError(error)) {
      throw new CashioValidationError('Ya existe una categoría con ese nombre.');
    }
    throw error;
  }
}

export async function updateCategory(db: SQLiteDatabase, id: number, input: SaveCategoryInput) {
  const description = assertDescription(input.description, 'categoría');

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE categories
         SET description = ?, type = ?, updated_at = ?
         WHERE id = ?`,
        description,
        input.type,
        nowIso(),
        id
      );

      if (input.type === 'income') {
        await db.runAsync('DELETE FROM monthly_budget_allocations WHERE category_id = ?', id);
      }
    });
  } catch (error) {
    if (isUniqueError(error)) {
      throw new CashioValidationError('Ya existe una categoría con ese nombre.');
    }
    throw error;
  }
}

export async function deleteCategory(db: SQLiteDatabase, id: number) {
  const usage = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?',
    id
  );

  if ((usage?.count ?? 0) > 0) {
    throw new CashioValidationError('No se puede eliminar una categoría asociada a transacciones.');
  }

  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}

export async function listTags(db: SQLiteDatabase, search = '') {
  const like = `%${search.trim()}%`;
  return db.getAllAsync<Tag>(
    `
      SELECT
        tags.id,
        tags.description,
        tags.created_at,
        tags.updated_at,
        COUNT(transaction_tags.transaction_id) AS transaction_count
      FROM tags
      LEFT JOIN transaction_tags ON transaction_tags.tag_id = tags.id
      WHERE tags.description LIKE ? COLLATE NOCASE
      GROUP BY tags.id
      ORDER BY tags.description COLLATE NOCASE ASC
    `,
    like
  );
}

export async function createTag(db: SQLiteDatabase, input: SaveTagInput) {
  const description = assertDescription(input.description, 'tag');
  const timestamp = nowIso();

  try {
    const result = await db.runAsync(
      `INSERT INTO tags (description, created_at, updated_at)
       VALUES (?, ?, ?)`,
      description,
      timestamp,
      timestamp
    );

    return db.getFirstAsync<Tag>(
      `
        SELECT id, description, created_at, updated_at, 0 AS transaction_count
        FROM tags
        WHERE id = ?
      `,
      result.lastInsertRowId
    );
  } catch (error) {
    if (isUniqueError(error)) {
      throw new CashioValidationError('Ya existe un tag con ese nombre.');
    }
    throw error;
  }
}

export async function updateTag(db: SQLiteDatabase, id: number, input: SaveTagInput) {
  const description = assertDescription(input.description, 'tag');

  try {
    await db.runAsync(
      `UPDATE tags
       SET description = ?, updated_at = ?
       WHERE id = ?`,
      description,
      nowIso(),
      id
    );
  } catch (error) {
    if (isUniqueError(error)) {
      throw new CashioValidationError('Ya existe un tag con ese nombre.');
    }
    throw error;
  }
}

export async function deleteTag(db: SQLiteDatabase, id: number) {
  const usage = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM transaction_tags WHERE tag_id = ?',
    id
  );

  if ((usage?.count ?? 0) > 0) {
    throw new CashioValidationError('No se puede eliminar un tag asociado a transacciones.');
  }

  await db.runAsync('DELETE FROM tags WHERE id = ?', id);
}

async function insertTransactionTags(db: SQLiteDatabase, transactionId: number, tagIds: number[]) {
  for (const tagId of tagIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
      transactionId,
      tagId
    );
  }
}

export async function createTransaction(db: SQLiteDatabase, input: CreateTransactionInput) {
  const description = normalizeDescription(input.description);

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new CashioValidationError('El monto debe ser mayor que cero.');
  }

  if (!input.categoryId) {
    throw new CashioValidationError('Selecciona una categoría.');
  }

  await assertAccountExists(db, input.accountId);

  if (input.destinationAccountId != null) {
    if (input.type !== 'expense') {
      throw new CashioValidationError('Los traslados se registran desde un egreso.');
    }
    if (input.destinationAccountId === input.accountId) {
      throw new CashioValidationError('La cuenta destino debe ser diferente.');
    }
    await assertAccountExists(db, input.destinationAccountId);
  }

  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    if (input.destinationAccountId != null) {
      const transferGroupId = createTransferGroupId();
      const origin = await db.runAsync(
        `INSERT INTO transactions
          (
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
         VALUES ('expense', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        input.amount,
        description || null,
        input.transactionDate,
        input.accountId,
        input.categoryId,
        transferGroupId,
        input.destinationAccountId,
        timestamp,
        timestamp
      );
      const destination = await db.runAsync(
        `INSERT INTO transactions
          (
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
         VALUES ('income', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        input.amount,
        description || null,
        input.transactionDate,
        input.destinationAccountId,
        input.categoryId,
        transferGroupId,
        input.accountId,
        timestamp,
        timestamp
      );

      await insertTransactionTags(db, origin.lastInsertRowId, input.tagIds);
      await insertTransactionTags(db, destination.lastInsertRowId, input.tagIds);
      await recalculateMonthlySummary(db, input.accountId, getTransactionMonth(input.transactionDate));
      await recalculateMonthlySummary(
        db,
        input.destinationAccountId,
        getTransactionMonth(input.transactionDate)
      );
      return;
    }

    const result = await db.runAsync(
      `INSERT INTO transactions
        (
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
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
      input.type,
      input.amount,
      description || null,
      input.transactionDate,
      input.accountId,
      input.categoryId,
      timestamp,
      timestamp
    );

    await insertTransactionTags(db, result.lastInsertRowId, input.tagIds);
    await recalculateMonthlySummary(db, input.accountId, getTransactionMonth(input.transactionDate));
  });
}

export async function deleteTransactions(db: SQLiteDatabase, ids: number[]) {
  const uniqueIds = Array.from(new Set(ids)).filter((id) => Number.isInteger(id) && id > 0);

  if (uniqueIds.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const selectedRows = await db.getAllAsync<{
      transfer_group_id: string | null;
    }>(
      `SELECT transfer_group_id FROM transactions WHERE id IN (${placeholders})`,
      ...uniqueIds
    );
    const transferGroupIds = selectedRows
      .map((row) => row.transfer_group_id)
      .filter((value): value is string => !!value);
    const transferPlaceholders = transferGroupIds.map(() => '?').join(', ');
    const expandedRows =
      transferGroupIds.length > 0
        ? await db.getAllAsync<{
            account_id: number;
            id: number;
            transaction_date: string;
          }>(
            `
              SELECT id, account_id, transaction_date
              FROM transactions
              WHERE id IN (${placeholders})
                OR transfer_group_id IN (${transferPlaceholders})
            `,
            ...uniqueIds,
            ...transferGroupIds
          )
        : await db.getAllAsync<{
            account_id: number;
            id: number;
            transaction_date: string;
          }>(
            `SELECT id, account_id, transaction_date FROM transactions WHERE id IN (${placeholders})`,
            ...uniqueIds
          );
    const deleteIds = Array.from(new Set(expandedRows.map((row) => row.id)));
    const affectedAccountMonths = Array.from(
      new Set(
        expandedRows.map((row) => `${row.account_id}:${getTransactionMonth(row.transaction_date)}`)
      )
    );

    for (const id of deleteIds) {
      await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
    }

    for (const accountMonth of affectedAccountMonths) {
      const [accountId, month] = accountMonth.split(':');
      await recalculateMonthlySummary(db, Number(accountId), month);
    }
  });
}

export async function listMonthlySummaries(db: SQLiteDatabase) {
  return db.getAllAsync<MonthlySummaryRow>(`
    SELECT
      account_id,
      month,
      income_total,
      expense_total,
      transfer_in_total,
      transfer_out_total,
      net_total,
      transaction_count,
      updated_at
    FROM monthly_summaries
    ORDER BY month ASC, account_id ASC
  `);
}

function buildMonthlyBudgetSummary(
  items: MonthlyBudgetItem[],
  unbudgetedExpenses: MonthlyBudgetUnbudgetedExpense[]
): MonthlyBudgetSummary {
  return {
    planned_total: items.reduce((total, item) => total + item.planned_amount, 0),
    spent_total: items.reduce((total, item) => total + item.spent_amount, 0),
    remaining_total: items.reduce((total, item) => total + item.remaining_amount, 0),
    unbudgeted_expense_total: unbudgetedExpenses.reduce(
      (total, expense) => total + expense.spent_amount,
      0
    ),
  };
}

export async function getMonthlyBudgetData(
  db: SQLiteDatabase,
  accountScope: AccountScope,
  month: string
): Promise<MonthlyBudgetData> {
  const budgetMonth = assertMonth(month);

  if (accountScope === 'all') {
    const [items, unbudgetedExpenses] = await Promise.all([
      db.getAllAsync<MonthlyBudgetItem>(
        `
          WITH monthly_spending AS (
            SELECT
              category_id,
              COALESCE(SUM(amount), 0) AS spent_amount
            FROM transactions
            WHERE type = 'expense'
              AND is_transfer = 0
              AND substr(transaction_date, 1, 7) = ?
            GROUP BY category_id
          ),
          budgeted AS (
            SELECT
              category_id,
              COALESCE(SUM(planned_amount), 0) AS planned_amount,
              MIN(id) AS allocation_id
            FROM monthly_budget_allocations
            WHERE month = ?
            GROUP BY category_id
          )
          SELECT
            budgeted.allocation_id AS allocation_id,
            categories.id AS category_id,
            categories.description AS category_description,
            categories.type AS category_type,
            budgeted.planned_amount AS planned_amount,
            COALESCE(monthly_spending.spent_amount, 0) AS spent_amount,
            budgeted.planned_amount - COALESCE(monthly_spending.spent_amount, 0)
              AS remaining_amount
          FROM budgeted
          INNER JOIN categories ON categories.id = budgeted.category_id
          LEFT JOIN monthly_spending ON monthly_spending.category_id = categories.id
          WHERE categories.type IS NULL OR categories.type IN ('expense', 'both')
          ORDER BY categories.description COLLATE NOCASE ASC
        `,
        budgetMonth,
        budgetMonth
      ),
      db.getAllAsync<MonthlyBudgetUnbudgetedExpense>(
        `
          WITH monthly_spending AS (
            SELECT
              category_id,
              COALESCE(SUM(amount), 0) AS spent_amount
            FROM transactions
            WHERE type = 'expense'
              AND is_transfer = 0
              AND substr(transaction_date, 1, 7) = ?
            GROUP BY category_id
          )
          SELECT
            categories.id AS category_id,
            categories.description AS category_description,
            categories.type AS category_type,
            monthly_spending.spent_amount AS spent_amount
          FROM monthly_spending
          INNER JOIN categories ON categories.id = monthly_spending.category_id
          WHERE NOT EXISTS (
            SELECT 1
            FROM monthly_budget_allocations
            WHERE monthly_budget_allocations.category_id = categories.id
              AND monthly_budget_allocations.month = ?
          )
            AND monthly_spending.spent_amount > 0
          ORDER BY monthly_spending.spent_amount DESC, categories.description COLLATE NOCASE ASC
        `,
        budgetMonth,
        budgetMonth
      ),
    ]);

    return {
      accountScope,
      availableCategories: [],
      items,
      summary: buildMonthlyBudgetSummary(items, unbudgetedExpenses),
      unbudgetedExpenses,
    };
  }

  const [items, availableCategories, unbudgetedExpenses] = await Promise.all([
    db.getAllAsync<MonthlyBudgetItem>(
      `
        WITH monthly_spending AS (
          SELECT
            category_id,
            COALESCE(SUM(amount), 0) AS spent_amount
          FROM transactions
          WHERE account_id = ?
            AND type = 'expense'
            AND is_transfer = 0
            AND substr(transaction_date, 1, 7) = ?
          GROUP BY category_id
        )
        SELECT
          monthly_budget_allocations.id AS allocation_id,
          categories.id AS category_id,
          categories.description AS category_description,
          categories.type AS category_type,
          monthly_budget_allocations.planned_amount AS planned_amount,
          COALESCE(monthly_spending.spent_amount, 0) AS spent_amount,
          monthly_budget_allocations.planned_amount - COALESCE(monthly_spending.spent_amount, 0)
            AS remaining_amount
        FROM monthly_budget_allocations
        INNER JOIN categories ON categories.id = monthly_budget_allocations.category_id
        LEFT JOIN monthly_spending ON monthly_spending.category_id = categories.id
        WHERE monthly_budget_allocations.account_id = ?
          AND monthly_budget_allocations.month = ?
          AND (categories.type IS NULL OR categories.type IN ('expense', 'both'))
        ORDER BY categories.description COLLATE NOCASE ASC
      `,
      accountScope,
      budgetMonth,
      accountScope,
      budgetMonth
    ),
    db.getAllAsync<MonthlyBudgetAvailableCategory>(
      `
        SELECT
          categories.id AS category_id,
          categories.description AS category_description,
          categories.type AS category_type
        FROM categories
        LEFT JOIN monthly_budget_allocations
          ON monthly_budget_allocations.category_id = categories.id
          AND monthly_budget_allocations.account_id = ?
          AND monthly_budget_allocations.month = ?
        WHERE monthly_budget_allocations.id IS NULL
          AND (categories.type IS NULL OR categories.type IN ('expense', 'both'))
        ORDER BY categories.description COLLATE NOCASE ASC
      `,
      accountScope,
      budgetMonth
    ),
    db.getAllAsync<MonthlyBudgetUnbudgetedExpense>(
      `
        WITH monthly_spending AS (
          SELECT
            category_id,
            COALESCE(SUM(amount), 0) AS spent_amount
          FROM transactions
          WHERE account_id = ?
            AND type = 'expense'
            AND is_transfer = 0
            AND substr(transaction_date, 1, 7) = ?
          GROUP BY category_id
        )
        SELECT
          categories.id AS category_id,
          categories.description AS category_description,
          categories.type AS category_type,
          monthly_spending.spent_amount AS spent_amount
        FROM monthly_spending
        INNER JOIN categories ON categories.id = monthly_spending.category_id
        LEFT JOIN monthly_budget_allocations
          ON monthly_budget_allocations.category_id = categories.id
          AND monthly_budget_allocations.account_id = ?
          AND monthly_budget_allocations.month = ?
        WHERE monthly_budget_allocations.id IS NULL
          AND monthly_spending.spent_amount > 0
        ORDER BY monthly_spending.spent_amount DESC, categories.description COLLATE NOCASE ASC
      `,
      accountScope,
      budgetMonth,
      accountScope,
      budgetMonth
    ),
  ]);

  return {
    accountScope,
    availableCategories,
    items,
    summary: buildMonthlyBudgetSummary(items, unbudgetedExpenses),
    unbudgetedExpenses,
  };
}

export async function addMonthlyBudgetCategory(
  db: SQLiteDatabase,
  accountScope: AccountScope,
  month: string,
  categoryId: number
) {
  const accountId = assertConcreteAccountScope(accountScope);
  const budgetMonth = assertMonth(month);
  await assertAccountExists(db, accountId);
  await assertBudgetableCategory(db, categoryId);

  const timestamp = nowIso();
  await db.runAsync(
    `
      INSERT INTO monthly_budget_allocations
        (account_id, month, category_id, planned_amount, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(account_id, month, category_id) DO NOTHING
    `,
    accountId,
    budgetMonth,
    categoryId,
    timestamp,
    timestamp
  );
}

export async function updateMonthlyBudgetAmount(
  db: SQLiteDatabase,
  input: SaveMonthlyBudgetAmountInput
) {
  const accountId = assertConcreteAccountScope(input.accountScope);
  const month = assertMonth(input.month);

  if (!Number.isFinite(input.plannedAmount) || input.plannedAmount < 0) {
    throw new CashioValidationError('El valor del presupuesto no es válido.');
  }

  await assertBudgetableCategory(db, input.categoryId);

  const timestamp = nowIso();
  const result = await db.runAsync(
    `
      UPDATE monthly_budget_allocations
      SET planned_amount = ?, updated_at = ?
      WHERE account_id = ? AND month = ? AND category_id = ?
    `,
    input.plannedAmount,
    timestamp,
    accountId,
    month,
    input.categoryId
  );

  if (result.changes === 0) {
    throw new CashioValidationError('Agrega la categoría al presupuesto antes de asignar un valor.');
  }
}

export async function removeMonthlyBudgetCategory(
  db: SQLiteDatabase,
  accountScope: AccountScope,
  month: string,
  categoryId: number
) {
  await db.runAsync(
    'DELETE FROM monthly_budget_allocations WHERE account_id = ? AND month = ? AND category_id = ?',
    assertConcreteAccountScope(accountScope),
    assertMonth(month),
    categoryId
  );
}

export async function copyPreviousMonthBudget(
  db: SQLiteDatabase,
  accountScope: AccountScope,
  fromMonth: string,
  toMonth: string
) {
  const accountId = assertConcreteAccountScope(accountScope);
  const sourceMonth = assertMonth(fromMonth);
  const targetMonth = assertMonth(toMonth);
  const timestamp = nowIso();
  const result = await db.runAsync(
    `
      INSERT INTO monthly_budget_allocations
        (account_id, month, category_id, planned_amount, created_at, updated_at)
      SELECT
        ?,
        ?,
        source.category_id,
        source.planned_amount,
        ?,
        ?
      FROM monthly_budget_allocations AS source
      INNER JOIN categories ON categories.id = source.category_id
      WHERE source.account_id = ?
        AND source.month = ?
        AND (categories.type IS NULL OR categories.type IN ('expense', 'both'))
        AND NOT EXISTS (
          SELECT 1
          FROM monthly_budget_allocations AS target
          WHERE target.account_id = ?
            AND target.month = ?
            AND target.category_id = source.category_id
        )
    `,
    accountId,
    targetMonth,
    timestamp,
    timestamp,
    accountId,
    sourceMonth,
    accountId,
    targetMonth
  );

  return result.changes;
}

export async function listAccountBalances(db: SQLiteDatabase, month: string) {
  const balanceMonth = assertMonth(month);
  return db.getAllAsync<AccountBalanceRow>(
    `
      SELECT
        accounts.id AS account_id,
        accounts.name AS account_name,
        accounts.initial_balance AS initial_balance,
        COALESCE(monthly_summaries.income_total, 0) AS income_total,
        COALESCE(monthly_summaries.expense_total, 0) AS expense_total,
        COALESCE(monthly_summaries.transfer_in_total, 0) AS transfer_in_total,
        COALESCE(monthly_summaries.transfer_out_total, 0) AS transfer_out_total,
        COALESCE(monthly_summaries.net_total, 0) AS month_net_total,
        accounts.initial_balance + COALESCE((
          SELECT SUM(net_total)
          FROM monthly_summaries AS previous_summaries
          WHERE previous_summaries.account_id = accounts.id
            AND previous_summaries.month <= ?
        ), 0) AS balance_total
      FROM accounts
      LEFT JOIN monthly_summaries
        ON monthly_summaries.account_id = accounts.id
        AND monthly_summaries.month = ?
      WHERE accounts.is_archived = 0
      ORDER BY accounts.sort_order ASC, accounts.name COLLATE NOCASE ASC
    `,
    balanceMonth,
    balanceMonth
  );
}

export async function listTransactions(db: SQLiteDatabase) {
  return db.getAllAsync<Transaction>(`
    SELECT
      transactions.id,
      transactions.type,
      transactions.amount,
      transactions.description,
      transactions.transaction_date,
      transactions.account_id,
      accounts.name AS account_name,
      transactions.category_id,
      categories.description AS category_description,
      transactions.is_transfer,
      transactions.transfer_group_id,
      transactions.transfer_peer_account_id,
      peer_accounts.name AS transfer_peer_account_name,
      COALESCE(GROUP_CONCAT(tags.description, ', '), '') AS tags,
      transactions.created_at,
      transactions.updated_at
    FROM transactions
    INNER JOIN accounts ON accounts.id = transactions.account_id
    INNER JOIN categories ON categories.id = transactions.category_id
    LEFT JOIN accounts AS peer_accounts ON peer_accounts.id = transactions.transfer_peer_account_id
    LEFT JOIN transaction_tags ON transaction_tags.transaction_id = transactions.id
    LEFT JOIN tags ON tags.id = transaction_tags.tag_id
    GROUP BY transactions.id
    ORDER BY transactions.transaction_date DESC, transactions.id DESC
  `);
}
