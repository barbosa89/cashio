import type { Transaction } from '@/lib/database';

export type TransactionFilterSummary = {
  expense: number;
  income: number;
  transferIn: number;
  transferOut: number;
};

export function buildTransactionFilterSummary(
  transactions: Transaction[]
): TransactionFilterSummary {
  let income = 0;
  let expense = 0;
  let transferIn = 0;
  let transferOut = 0;

  for (const transaction of transactions) {
    if (transaction.is_transfer === 1) {
      if (transaction.type === 'income') {
        transferIn += transaction.amount;
        continue;
      }

      transferOut += transaction.amount;
      continue;
    }

    if (transaction.type === 'income') {
      income += transaction.amount;
      continue;
    }

    expense += transaction.amount;
  }

  return {
    expense,
    income,
    transferIn,
    transferOut,
  };
}

export function formatFilterSummaryMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}
