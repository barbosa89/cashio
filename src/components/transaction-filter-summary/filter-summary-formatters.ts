import type { Transaction } from '@/lib/database';

export type TransactionFilterSummary = {
  expense: number;
  income: number;
  net: number;
};

export function buildTransactionFilterSummary(
  transactions: Transaction[]
): TransactionFilterSummary {
  let income = 0;
  let expense = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'income') {
      income += transaction.amount;
      continue;
    }

    expense += transaction.amount;
  }

  return {
    expense,
    income,
    net: income - expense,
  };
}

export function formatFilterSummaryMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}
