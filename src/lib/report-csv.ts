import type { MonthlySummaryRow, Transaction } from "@/lib/database";
import { AppError, type AppErrorDescriptor } from "@/i18n/errors";
import { capitalizeLocalized, formatMonthYear } from "@/i18n/formatters";
import type { AppTranslator } from "@/i18n/types";

export type MonthlyReportRange = {
  startMonth: string;
  endMonth: string;
};

export type MonthlyReportFile = {
  contents: string;
  fileName: string;
  openingBalance: number;
  shareTitle: string;
  transactionCount: number;
};

type BuildMonthlyReportInput = {
  currentMonth?: string;
  initialBalance?: number;
  monthlySummaries: MonthlySummaryRow[];
  range: MonthlyReportRange;
  transactions: Transaction[];
  localization: ReportLocalization;
};

export type ReportLocalization = {
  locale: string;
  t: AppTranslator;
};

function padMonth(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${padMonth(month)}-${String(day).padStart(2, "0")}`;
}

function isMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function getPreviousMonthLastDate(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const previousMonthEnd = new Date(year, month - 1, 0);

  return formatDate(
    previousMonthEnd.getFullYear(),
    previousMonthEnd.getMonth() + 1,
    previousMonthEnd.getDate(),
  );
}

function protectSpreadsheetFormula(value: string) {
  const firstVisibleCharacter = value.trimStart().charAt(0);

  if (["=", "+", "-", "@", "\t", "\r"].includes(firstVisibleCharacter)) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvCell(value: string | number, protectFormula = false) {
  let serialized = String(value);

  if (protectFormula) {
    serialized = protectSpreadsheetFormula(serialized);
  }

  if (/[;"\r\n]/.test(serialized)) {
    return `"${serialized.replaceAll('"', '""')}"`;
  }

  return serialized;
}

function serializeRow(
  values: Array<string | number>,
  protectedIndexes: number[] = [],
) {
  return values
    .map((value, index) =>
      escapeCsvCell(value, protectedIndexes.includes(index)),
    )
    .join(";");
}

function transactionTypeLabel(transaction: Transaction, t: AppTranslator) {
  if (transaction.is_transfer === 1) {
    return transaction.type === "income"
      ? t("reports.incomingTransfer")
      : t("reports.outgoingTransfer");
  }

  return transaction.type === "income" ? t("common.income") : t("common.expense");
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`;
}

export function formatReportMonth(monthKey: string, locale: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return capitalizeLocalized(formatMonthYear(year, month, locale), locale);
}

export function validateMonthlyReportRange(
  range: MonthlyReportRange,
  currentMonth = getCurrentMonthKey(),
): AppErrorDescriptor | null {
  if (!isMonthKey(range.startMonth) || !isMonthKey(range.endMonth)) {
    return { code: "invalidReportRange" };
  }

  if (range.startMonth > range.endMonth) {
    return { code: "reversedReportRange" };
  }

  if (range.startMonth > currentMonth || range.endMonth > currentMonth) {
    return { code: "futureReportRange" };
  }

  return null;
}

export function buildMonthlyReportCsv({
  currentMonth = getCurrentMonthKey(),
  initialBalance = 0,
  localization,
  monthlySummaries,
  range,
  transactions,
}: BuildMonthlyReportInput): MonthlyReportFile {
  const { t } = localization;
  const validationError = validateMonthlyReportRange(range, currentMonth);

  if (validationError) {
    throw new AppError(validationError);
  }

  const csvHeaders = [
    t("reports.headerId"),
    t("reports.headerDate"),
    t("reports.headerAccount"),
    t("reports.headerType"),
    t("reports.headerAmount"),
    t("reports.headerDescription"),
    t("reports.headerCategory"),
    t("reports.headerTags"),
    t("reports.headerCreatedAt"),
    t("reports.headerUpdatedAt"),
  ];

  const openingBalance = monthlySummaries.reduce(
    (total, summary) =>
      summary.month < range.startMonth ? total + summary.net_total : total,
    initialBalance,
  );
  const reportTransactions = transactions
    .filter((transaction) => {
      const transactionMonth = transaction.transaction_date.slice(0, 7);
      return (
        transactionMonth >= range.startMonth &&
        transactionMonth <= range.endMonth
      );
    })
    .sort((left, right) => {
      const dateComparison = left.transaction_date.localeCompare(
        right.transaction_date,
      );
      return dateComparison || left.id - right.id;
    });
  const rows = [
    serializeRow(csvHeaders),
    serializeRow([
      "",
      getPreviousMonthLastDate(range.startMonth),
      "",
      t("reports.openingBalanceType"),
      openingBalance,
      t("reports.previousBalance"),
      "",
      "",
      "",
      "",
    ]),
    ...reportTransactions.map((transaction) =>
      serializeRow(
        [
          transaction.id,
          transaction.transaction_date,
          transaction.account_name,
          transactionTypeLabel(transaction, t),
          transaction.amount,
          transaction.description ?? "",
          transaction.category_description,
          transaction.tags,
          transaction.created_at,
          transaction.updated_at,
        ],
        [5, 6, 7],
      ),
    ),
  ];

  return {
    contents: `\uFEFF${rows.join("\r\n")}\r\n`,
    fileName: t("reports.csvFileName", {
      end: range.endMonth,
      start: range.startMonth,
    }),
    openingBalance,
    shareTitle: t("reports.shareTitle"),
    transactionCount: reportTransactions.length,
  };
}
