import type { CreateTransactionInput } from "@/lib/cashio-repository";
import type { Account, Category, Tag, TransactionType } from "@/lib/database";
import type { TransactionExtraction } from "@/lib/ai/transaction-schema";

export type FieldResolution =
  | "exact"
  | "ambiguous"
  | "missing"
  | "invalid"
  | "omitted"
  | "not_applicable";

export type TransactionDraftValues = Partial<CreateTransactionInput> & {
  destinationAccountId?: number | null;
  tagIds?: number[];
  transactionMode?: "income" | "expense" | "transfer";
  type?: TransactionType;
};

export type ResolvedTransactionDraft = {
  fieldResolutions: {
    account: FieldResolution;
    amount: FieldResolution;
    category: FieldResolution;
    date: FieldResolution;
    destinationAccount: FieldResolution;
    tags: FieldResolution;
    type: FieldResolution;
  };
  needsReview: boolean;
  values: TransactionDraftValues;
  warnings: Array<
    | "multiple_entries"
    | "currency_mentioned"
    | "future_date"
    | "missing_fields"
    | "ambiguous_fields"
  >;
};

type DraftCatalogs = {
  accounts: readonly Pick<Account, "id" | "name">[];
  categories: readonly Pick<Category, "description" | "id" | "type">[];
  tags: readonly Pick<Tag, "description" | "id">[];
};

function normalizeName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function resolveNamedEntity<T extends { id: number }>(
  name: string | null,
  items: readonly T[],
  getName: (item: T) => string,
) {
  if (!name?.trim()) {
    return { id: null, resolution: "omitted" as const };
  }

  const normalizedName = normalizeName(name);
  const matches = items.filter(
    (item) => normalizeName(getName(item)) === normalizedName,
  );
  if (matches.length === 1) {
    return { id: matches[0].id, resolution: "exact" as const };
  }
  return {
    id: null,
    resolution: matches.length > 1 ? ("ambiguous" as const) : ("missing" as const),
  };
}

function isRealDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
}

export function canReviewTransactionExtraction(
  extraction: TransactionExtraction,
) {
  return (
    extraction.detectedEntryCount === 1 &&
    extraction.type !== null &&
    extraction.transactionDate !== null &&
    isRealDate(extraction.transactionDate)
  );
}

export function resolveTransactionDraft(
  extraction: TransactionExtraction,
  catalogs: DraftCatalogs,
  options: { preferredAccountId?: number | null; today: string },
): ResolvedTransactionDraft {
  const transactionType = extraction.type === "income" ? "income" : "expense";
  const account = resolveNamedEntity(
    extraction.accountName,
    catalogs.accounts,
    (item) => item.name,
  );
  const compatibleCategories =
    extraction.type === null
      ? []
      : catalogs.categories.filter(
          (category) =>
            category.type === null ||
            category.type === "both" ||
            category.type === transactionType,
        );
  const category = resolveNamedEntity(
    extraction.categoryName,
    compatibleCategories,
    (item) => item.description,
  );
  const resolvedDestination =
    extraction.type === "transfer"
      ? resolveNamedEntity(
          extraction.destinationAccountName,
          catalogs.accounts,
          (item) => item.name,
        )
      : { id: null, resolution: "not_applicable" as const };
  const destination =
    resolvedDestination.id !== null && resolvedDestination.id === account.id
      ? { id: null, resolution: "invalid" as const }
      : resolvedDestination;
  const tagResults = extraction.tagNames.map((name) =>
    resolveNamedEntity(name, catalogs.tags, (item) => item.description),
  );
  const tagIds = tagResults.flatMap((result) =>
    result.id === null ? [] : [result.id],
  );
  const tagsResolution = tagResults.some(
    (result) => result.resolution === "ambiguous",
  )
    ? "ambiguous"
    : tagResults.some((result) => result.resolution === "missing")
      ? "missing"
      : tagResults.length === 0
        ? "omitted"
        : "exact";
  const amountResolution =
    extraction.amount === null
      ? "omitted"
      : Number.isInteger(extraction.amount) && extraction.amount > 0
        ? "exact"
        : "invalid";
  const dateResolution =
    extraction.transactionDate === null
      ? "omitted"
      : isRealDate(extraction.transactionDate)
        ? "exact"
        : "invalid";
  const accountId = account.id;
  const fieldResolutions: ResolvedTransactionDraft["fieldResolutions"] = {
    account: account.resolution,
    amount: amountResolution,
    category: category.resolution,
    date: dateResolution,
    destinationAccount: destination.resolution,
    tags: tagsResolution,
    type: extraction.type === null ? "omitted" : "exact",
  };
  const resolutions = Object.values(fieldResolutions);
  const warnings: ResolvedTransactionDraft["warnings"] = [];
  if (extraction.detectedEntryCount !== 1) warnings.push("multiple_entries");
  if (extraction.currencyMention) warnings.push("currency_mentioned");
  if (extraction.transactionDate && extraction.transactionDate > options.today) {
    warnings.push("future_date");
  }
  if (resolutions.some((value) => value === "ambiguous")) {
    warnings.push("ambiguous_fields");
  }
  if (resolutions.some((value) => value === "missing" || value === "omitted" || value === "invalid")) {
    warnings.push("missing_fields");
  }

  return {
    fieldResolutions,
    needsReview: true,
    values: {
      ...(accountId ? { accountId } : {}),
      ...(amountResolution === "exact" ? { amount: extraction.amount as number } : {}),
      ...(category.id ? { categoryId: category.id } : {}),
      description: extraction.description.trim(),
      destinationAccountId: destination.id,
      tagIds: [...new Set(tagIds)],
      ...(extraction.type === "transfer"
        ? { transactionMode: "transfer" as const }
        : {}),
      transactionDate:
        dateResolution === "exact"
          ? (extraction.transactionDate as string)
          : options.today,
      type: transactionType,
    },
    warnings,
  };
}
