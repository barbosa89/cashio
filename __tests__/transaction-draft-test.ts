import {
  canReviewTransactionExtraction,
  resolveTransactionDraft,
} from "@/lib/ai/transaction-draft";
import type { TransactionExtraction } from "@/lib/ai/transaction-schema";

const catalogs = {
  accounts: [
    { id: 1, name: "Principal" },
    { id: 2, name: "Ahorros" },
  ],
  categories: [
    { id: 3, description: "Comida", type: "expense" as const },
    { id: 4, description: "Salario", type: "income" as const },
  ],
  tags: [{ id: 5, description: "Hogar" }],
};

function extraction(overrides: Partial<TransactionExtraction> = {}): TransactionExtraction {
  return {
    accountName: "principal",
    amount: 25_000,
    categoryName: "comída",
    currencyMention: null,
    destinationAccountName: null,
    detectedEntryCount: 1,
    description: "Supermercado",
    tagNames: ["hogar"],
    transactionDate: "2026-09-28",
    type: "expense",
    ...overrides,
  };
}

describe("resolveTransactionDraft", () => {
  test("rejects incomplete, invalid, or multi-entry extractions before review", () => {
    expect(canReviewTransactionExtraction(extraction())).toBe(true);
    expect(
      canReviewTransactionExtraction(extraction({ detectedEntryCount: 2 })),
    ).toBe(false);
    expect(canReviewTransactionExtraction(extraction({ type: null }))).toBe(false);
    expect(
      canReviewTransactionExtraction(
        extraction({ transactionDate: "2026-02-31" }),
      ),
    ).toBe(false);
  });

  test("resolves exact normalized names without allowing the model to provide ids", () => {
    const result = resolveTransactionDraft(extraction(), catalogs, {
      today: "2026-09-28",
    });

    expect(result.values).toEqual({
      accountId: 1,
      amount: 25_000,
      categoryId: 3,
      description: "Supermercado",
      destinationAccountId: null,
      tagIds: [5],
      transactionDate: "2026-09-28",
      type: "expense",
    });
    expect(result.fieldResolutions.account).toBe("exact");
    expect(result.warnings).toEqual([]);
  });

  test("leaves unknown and ambiguous entities unselected", () => {
    const result = resolveTransactionDraft(
      extraction({ accountName: "Unknown", categoryName: "Other", tagNames: ["Missing"] }),
      catalogs,
      { today: "2026-09-28" },
    );

    expect(result.values.accountId).toBeUndefined();
    expect(result.values.categoryId).toBeUndefined();
    expect(result.values.tagIds).toEqual([]);
    expect(result.warnings).toContain("missing_fields");
  });

  test("resolves transfers only when both existing accounts are distinct", () => {
    const result = resolveTransactionDraft(
      extraction({ destinationAccountName: "Ahorros", type: "transfer" }),
      catalogs,
      { today: "2026-09-28" },
    );

    expect(result.values.type).toBe("expense");
    expect(result.values.transactionMode).toBe("transfer");
    expect(result.values.destinationAccountId).toBe(2);
  });

  test("preserves transfer intent when the destination cannot be resolved", () => {
    const result = resolveTransactionDraft(
      extraction({ destinationAccountName: "Missing", type: "transfer" }),
      catalogs,
      { today: "2026-09-28" },
    );

    expect(result.values.transactionMode).toBe("transfer");
    expect(result.values.destinationAccountId).toBeNull();
    expect(result.fieldResolutions.destinationAccount).toBe("missing");
    expect(result.warnings).toContain("missing_fields");
  });

  test("does not silently use the preferred account when none was spoken", () => {
    const result = resolveTransactionDraft(
      extraction({ accountName: null }),
      catalogs,
      { preferredAccountId: 1, today: "2026-09-28" },
    );

    expect(result.values.accountId).toBeUndefined();
    expect(result.fieldResolutions.account).toBe("omitted");
  });
});
