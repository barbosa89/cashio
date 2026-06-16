import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryType, Tag, Transaction, TransactionType } from '@/lib/database';

export type SaveCategoryInput = {
  description: string;
  type: CategoryType | null;
};

export type SaveTagInput = {
  description: string;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  categoryId: number;
  tagIds: number[];
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

function assertDescription(description: string, entity: 'categoría' | 'tag') {
  const normalized = normalizeDescription(description);
  if (!normalized) {
    throw new CashioValidationError(`El nombre del ${entity} no puede estar vacío.`);
  }
  return normalized;
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
    await db.runAsync(
      `UPDATE categories
       SET description = ?, type = ?, updated_at = ?
       WHERE id = ?`,
      description,
      input.type,
      nowIso(),
      id
    );
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

export async function createTransaction(db: SQLiteDatabase, input: CreateTransactionInput) {
  const description = normalizeDescription(input.description);

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new CashioValidationError('El monto debe ser mayor que cero.');
  }

  if (!input.categoryId) {
    throw new CashioValidationError('Selecciona una categoría.');
  }

  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO transactions
        (type, amount, description, transaction_date, category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.type,
      input.amount,
      description || null,
      input.transactionDate,
      input.categoryId,
      timestamp,
      timestamp
    );

    for (const tagId of input.tagIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
        result.lastInsertRowId,
        tagId
      );
    }
  });
}

export async function listTransactions(db: SQLiteDatabase) {
  return db.getAllAsync<Transaction>(`
    SELECT
      transactions.id,
      transactions.type,
      transactions.amount,
      transactions.description,
      transactions.transaction_date,
      transactions.category_id,
      categories.description AS category_description,
      COALESCE(GROUP_CONCAT(tags.description, ', '), '') AS tags,
      transactions.created_at,
      transactions.updated_at
    FROM transactions
    INNER JOIN categories ON categories.id = transactions.category_id
    LEFT JOIN transaction_tags ON transaction_tags.transaction_id = transactions.id
    LEFT JOIN tags ON tags.id = transaction_tags.tag_id
    GROUP BY transactions.id
    ORDER BY transactions.transaction_date DESC, transactions.id DESC
  `);
}
