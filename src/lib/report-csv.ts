import type { MonthlySummaryRow, Transaction } from '@/lib/database';

export type MonthlyReportRange = {
  startMonth: string;
  endMonth: string;
};

export type MonthlyReportFile = {
  contents: string;
  fileName: string;
  openingBalance: number;
  transactionCount: number;
};

type BuildMonthlyReportInput = {
  currentMonth?: string;
  monthlySummaries: MonthlySummaryRow[];
  range: MonthlyReportRange;
  transactions: Transaction[];
};

const CSV_HEADERS = [
  'ID',
  'Fecha',
  'Tipo',
  'Monto',
  'Descripción',
  'Categoría',
  'Tags',
  'Fecha de creación',
  'Fecha de actualización',
] as const;

function padMonth(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${padMonth(month)}-${String(day).padStart(2, '0')}`;
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
  const [year, month] = monthKey.split('-').map(Number);
  const previousMonthEnd = new Date(year, month - 1, 0);

  return formatDate(
    previousMonthEnd.getFullYear(),
    previousMonthEnd.getMonth() + 1,
    previousMonthEnd.getDate()
  );
}

function protectSpreadsheetFormula(value: string) {
  const firstVisibleCharacter = value.trimStart().charAt(0);

  if (['=', '+', '-', '@', '\t', '\r'].includes(firstVisibleCharacter)) {
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

function serializeRow(values: Array<string | number>, protectedIndexes: number[] = []) {
  return values
    .map((value, index) => escapeCsvCell(value, protectedIndexes.includes(index)))
    .join(';');
}

function transactionTypeLabel(type: Transaction['type']) {
  return type === 'income' ? 'Ingreso' : 'Egreso';
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`;
}

export function formatReportMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));

  return `${label.charAt(0).toLocaleUpperCase()}${label.slice(1)}`;
}

export function validateMonthlyReportRange(
  range: MonthlyReportRange,
  currentMonth = getCurrentMonthKey()
) {
  if (!isMonthKey(range.startMonth) || !isMonthKey(range.endMonth)) {
    return 'Selecciona un mes inicial y final válidos.';
  }

  if (range.startMonth > range.endMonth) {
    return 'El mes inicial no puede ser posterior al mes final.';
  }

  if (range.startMonth > currentMonth || range.endMonth > currentMonth) {
    return 'No se pueden exportar meses futuros.';
  }

  return null;
}

export function buildMonthlyReportCsv({
  currentMonth = getCurrentMonthKey(),
  monthlySummaries,
  range,
  transactions,
}: BuildMonthlyReportInput): MonthlyReportFile {
  const validationError = validateMonthlyReportRange(range, currentMonth);

  if (validationError) {
    throw new Error(validationError);
  }

  const openingBalance = monthlySummaries.reduce(
    (total, summary) =>
      summary.month < range.startMonth ? total + summary.net_total : total,
    0
  );
  const reportTransactions = transactions
    .filter((transaction) => {
      const transactionMonth = transaction.transaction_date.slice(0, 7);
      return transactionMonth >= range.startMonth && transactionMonth <= range.endMonth;
    })
    .sort((left, right) => {
      const dateComparison = left.transaction_date.localeCompare(right.transaction_date);
      return dateComparison || left.id - right.id;
    });
  const rows = [
    serializeRow([...CSV_HEADERS]),
    serializeRow([
      '',
      getPreviousMonthLastDate(range.startMonth),
      'Saldo',
      openingBalance,
      'Saldo anterior',
      '',
      '',
      '',
      '',
    ]),
    ...reportTransactions.map((transaction) =>
      serializeRow(
        [
          transaction.id,
          transaction.transaction_date,
          transactionTypeLabel(transaction.type),
          transaction.amount,
          transaction.description ?? '',
          transaction.category_description,
          transaction.tags,
          transaction.created_at,
          transaction.updated_at,
        ],
        [4, 5, 6]
      )
    ),
  ];

  return {
    contents: `\uFEFF${rows.join('\r\n')}\r\n`,
    fileName: `cashio-reporte-${range.startMonth}_a_${range.endMonth}.csv`,
    openingBalance,
    transactionCount: reportTransactions.length,
  };
}
