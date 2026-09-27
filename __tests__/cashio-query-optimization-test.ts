import {
  getMonthlyBudgetData,
  listTransactions,
  recalculateMonthlySummary,
} from "@/lib/cashio-repository";

describe("optimized transaction queries", () => {
  test("loads one month with indexable date bounds and no outer grouping", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);

    await listTransactions({ getAllAsync } as never, {
      accountScope: 2,
      month: "2026-09",
    });

    const [sql, ...params] = getAllAsync.mock.calls[0];
    expect(sql).toContain("transactions.account_id = ?");
    expect(sql).toContain("transactions.transaction_date >= ?");
    expect(sql).toContain("transactions.transaction_date < ?");
    expect(sql).toContain("WHERE transaction_tags.transaction_id = transactions.id");
    expect(sql).not.toContain("GROUP BY transactions.id");
    expect(params).toEqual([2, "2026-09-01", "2026-10-01"]);
  });

  test("loads only the selected report month range", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);

    await listTransactions({ getAllAsync } as never, {
      accountScope: "all",
      monthRange: { startMonth: "2026-01", endMonth: "2026-03" },
    });

    const [, ...params] = getAllAsync.mock.calls[0];
    expect(params).toEqual(["2026-01-01", "2026-04-01"]);
  });

  test("recalculates summaries with a date range instead of substr", async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({
      expense_total: 0,
      income_total: 0,
      net_total: 0,
      transaction_count: 0,
      transfer_in_total: 0,
      transfer_out_total: 0,
    });
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });

    await recalculateMonthlySummary(
      { getFirstAsync, runAsync } as never,
      3,
      "2026-12",
    );

    const [sql, ...params] = getFirstAsync.mock.calls[0];
    expect(sql).not.toContain("substr(transaction_date");
    expect(params).toEqual([3, "2026-12-01", "2027-01-01"]);
  });

  test("limits budget spending scans to the selected month", async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);

    await getMonthlyBudgetData({ getAllAsync } as never, 4, "2026-09");

    const spendingQueries = getAllAsync.mock.calls.filter(([sql]) =>
      sql.includes("WITH monthly_spending"),
    );
    expect(spendingQueries).toHaveLength(2);
    for (const [sql, accountId, startDate, endDate] of spendingQueries) {
      expect(sql).not.toContain("substr(transaction_date");
      expect([accountId, startDate, endDate]).toEqual([
        4,
        "2026-09-01",
        "2026-10-01",
      ]);
    }
  });
});
