import {
  getEditableTransaction,
  updateTransaction,
  type CreateTransactionInput,
} from "@/lib/cashio-repository";

const NORMAL_ROW = {
  account_id: 1,
  amount: 42000,
  category_id: 4,
  created_at: "2026-09-01T10:00:00.000Z",
  description: "Utilities",
  id: 8,
  is_transfer: 0,
  transaction_date: "2026-09-10",
  transfer_group_id: null,
  transfer_peer_account_id: null,
  type: "expense",
};

const TRANSFER_ORIGIN = {
  ...NORMAL_ROW,
  category_id: 9,
  description: "Move to savings",
  id: 10,
  is_transfer: 1,
  transfer_group_id: "transfer-1",
  transfer_peer_account_id: 2,
};

const TRANSFER_DESTINATION = {
  ...TRANSFER_ORIGIN,
  account_id: 2,
  id: 11,
  transfer_peer_account_id: 1,
  type: "income",
};

describe("transaction editing repository", () => {
  test("loads a normal transaction with tag ids for the editor", async () => {
    const db = {
      getAllAsync: jest.fn((sql: string) =>
        Promise.resolve(
          sql.includes("FROM accounts")
            ? [{ id: 1, name: "Main" }]
            : [{ tag_id: 3 }, { tag_id: 7 }],
        ),
      ),
      getFirstAsync: jest.fn().mockResolvedValue(NORMAL_ROW),
    };

    await expect(getEditableTransaction(db as never, 8)).resolves.toEqual({
      accountOptions: [{ id: 1, name: "Main" }],
      createdAt: NORMAL_ROW.created_at,
      id: 8,
      isTransfer: false,
      values: {
        accountId: 1,
        amount: 42000,
        categoryId: 4,
        description: "Utilities",
        destinationAccountId: null,
        tagIds: [3, 7],
        transactionDate: "2026-09-10",
        type: "expense",
      },
    });
  });

  test("resolves either transfer side to the expense-side logical transaction", async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(TRANSFER_DESTINATION),
      getAllAsync: jest.fn((sql: string) => {
        if (sql.includes("transfer_group_id")) {
          return Promise.resolve([TRANSFER_ORIGIN, TRANSFER_DESTINATION]);
        }
        return Promise.resolve([{ tag_id: 5 }]);
      }),
    };

    await expect(getEditableTransaction(db as never, 11)).resolves.toMatchObject({
      id: 10,
      isTransfer: true,
      values: {
        accountId: 1,
        destinationAccountId: 2,
        tagIds: [5],
        type: "expense",
      },
    });
  });

  test("converts a normal transaction into a transfer atomically", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 12 });
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn((sql: string) => {
        if (sql.includes("FROM accounts")) {
          return Promise.resolve({ id: 1, is_archived: 0 });
        }
        if (sql.includes("FROM categories")) {
          return Promise.resolve({ id: 9, type: "both" });
        }
        if (sql.includes("SELECT * FROM transactions")) {
          return Promise.resolve(NORMAL_ROW);
        }
        if (sql.includes("COUNT(*) AS count FROM tags")) {
          return Promise.resolve({ count: 1 });
        }
        if (sql.includes("FROM transactions")) {
          return Promise.resolve({
            expense_total: 42000,
            income_total: 0,
            net_total: -42000,
            transaction_count: 1,
            transfer_in_total: 0,
            transfer_out_total: 0,
          });
        }
        return Promise.resolve(null);
      }),
      runAsync,
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    };
    const input: CreateTransactionInput = {
      accountId: 1,
      amount: 50000,
      categoryId: 9,
      description: "Move to savings",
      destinationAccountId: 2,
      tagIds: [5],
      transactionDate: "2026-10-01",
      type: "expense",
    };

    await updateTransaction(db as never, 8, input);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync.mock.calls.some(([sql]) => sql.includes("INSERT INTO transactions"))).toBe(
      true,
    );
    expect(
      runAsync.mock.calls.filter(([sql]) => sql.includes("INSERT OR IGNORE INTO transaction_tags")),
    ).toHaveLength(2);
    expect(
      runAsync.mock.calls.filter(([sql]) => sql.includes("INSERT INTO monthly_summaries")),
    ).toHaveLength(3);
  });

  test("rejects an impossible calendar date before writing", async () => {
    const db = {
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
    };

    await expect(
      updateTransaction(db as never, 8, {
        accountId: 1,
        amount: 100,
        categoryId: 4,
        description: "Invalid date",
        destinationAccountId: null,
        tagIds: [],
        transactionDate: "2026-02-30",
        type: "expense",
      }),
    ).rejects.toThrow("invalidTransactionDate");
    expect(db.withTransactionAsync).not.toHaveBeenCalled();
  });
});
