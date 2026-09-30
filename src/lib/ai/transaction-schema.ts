export const TRANSACTION_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: ["string", "null"],
      enum: ["income", "expense", "transfer", null],
    },
    amount: { type: ["integer", "null"], minimum: 1 },
    transactionDate: {
      type: ["string", "null"],
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
    },
    description: { type: "string", maxLength: 120 },
    accountName: { type: ["string", "null"], maxLength: 80 },
    categoryName: { type: ["string", "null"], maxLength: 80 },
    tagNames: {
      type: "array",
      items: { type: "string", maxLength: 80 },
      maxItems: 10,
    },
    destinationAccountName: { type: ["string", "null"], maxLength: 80 },
    currencyMention: { type: ["string", "null"], maxLength: 20 },
    detectedEntryCount: { type: "integer", minimum: 0, maximum: 2 },
  },
  required: [
    "type",
    "amount",
    "transactionDate",
    "description",
    "accountName",
    "categoryName",
    "tagNames",
    "destinationAccountName",
    "currencyMention",
    "detectedEntryCount",
  ],
} as const;

export type TransactionExtraction = {
  accountName: string | null;
  amount: number | null;
  categoryName: string | null;
  currencyMention: string | null;
  destinationAccountName: string | null;
  detectedEntryCount: number;
  description: string;
  tagNames: string[];
  transactionDate: string | null;
  type: "income" | "expense" | "transfer" | null;
};

export type SpikeTransactionExtraction = TransactionExtraction;

export function parseSpikeTransactionExtraction(
  value: string,
): TransactionExtraction {
  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The model did not return a JSON object.");
  }

  const candidate = parsed as Record<string, unknown>;
  const allowedTypes = new Set(["income", "expense", "transfer", null]);
  const allowedKeys = new Set([
    "type",
    "amount",
    "transactionDate",
    "description",
    "accountName",
    "categoryName",
    "tagNames",
    "destinationAccountName",
    "currencyMention",
    "detectedEntryCount",
  ]);
  if (
    Object.keys(candidate).length !== allowedKeys.size ||
    Object.keys(candidate).some((key) => !allowedKeys.has(key)) ||
    !allowedTypes.has(candidate.type as never) ||
    !(
      candidate.amount === null ||
      (Number.isInteger(candidate.amount) && Number(candidate.amount) > 0)
    ) ||
    !(
      candidate.transactionDate === null ||
      (typeof candidate.transactionDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(candidate.transactionDate))
    ) ||
    typeof candidate.description !== "string" ||
    candidate.description.length > 120 ||
    !isNullableShortString(candidate.accountName, 80) ||
    !isNullableShortString(candidate.categoryName, 80) ||
    !isNullableShortString(candidate.destinationAccountName, 80) ||
    !isNullableShortString(candidate.currencyMention, 20) ||
    !Array.isArray(candidate.tagNames) ||
    candidate.tagNames.length > 10 ||
    candidate.tagNames.some(
      (tag) => typeof tag !== "string" || tag.length > 80,
    ) ||
    !Number.isInteger(candidate.detectedEntryCount) ||
    Number(candidate.detectedEntryCount) < 0 ||
    Number(candidate.detectedEntryCount) > 2
  ) {
    throw new Error("The model JSON failed the spike validation.");
  }

  return candidate as TransactionExtraction;
}

function isNullableShortString(value: unknown, maxLength: number) {
  return value === null || (typeof value === "string" && value.length <= maxLength);
}
