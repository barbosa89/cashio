import type { AccountBalanceRow } from '@/lib/database';
import { formatNumber } from '@/i18n/formatters';

export function formatBalanceMoney(value: number, locale: string) {
  return formatNumber(value, locale);
}

export function buildBalanceTotals(rows: AccountBalanceRow[], totalLabel = 'Total'): AccountBalanceRow {
  return rows.reduce<AccountBalanceRow>(
    (total, row) => ({
      account_id: 0,
      account_name: totalLabel,
      balance_total: total.balance_total + row.balance_total,
      expense_total: total.expense_total + row.expense_total,
      income_total: total.income_total + row.income_total,
      initial_balance: total.initial_balance + row.initial_balance,
      is_default: 0,
      month_net_total: total.month_net_total + row.month_net_total,
      transfer_in_total: total.transfer_in_total + row.transfer_in_total,
      transfer_out_total: total.transfer_out_total + row.transfer_out_total,
    }),
    {
      account_id: 0,
      account_name: totalLabel,
      balance_total: 0,
      expense_total: 0,
      income_total: 0,
      initial_balance: 0,
      is_default: 0,
      month_net_total: 0,
      transfer_in_total: 0,
      transfer_out_total: 0,
    }
  );
}
