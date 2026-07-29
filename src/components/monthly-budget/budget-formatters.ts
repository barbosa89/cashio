import { AppPalette } from '@/constants/theme';
import { formatNumber } from '@/i18n/formatters';
import type { MonthlyBudgetItem } from '@/lib/database';

export type BudgetStatus = {
  color: string;
  label: string;
  progress: number;
};

export type BudgetStatusLabels = {
  nearLimit: string;
  onTrack: string;
  overBudget: string;
};

export function formatBudgetMoney(value: number, locale: string) {
  return formatNumber(value, locale);
}

export function getBudgetStatus(
  item: MonthlyBudgetItem,
  labels: BudgetStatusLabels,
): BudgetStatus {
  const progress =
    item.planned_amount > 0 ? item.spent_amount / item.planned_amount : item.spent_amount > 0 ? 1 : 0;
  const isOver = item.planned_amount >= 0 && item.spent_amount > item.planned_amount;
  const isNearLimit = item.planned_amount > 0 && !isOver && progress >= 0.8;

  if (isOver) {
    return {
      color: AppPalette.brandOrange,
      label: labels.overBudget,
      progress,
    };
  }

  if (isNearLimit) {
    return {
      color: '#eab308',
      label: labels.nearLimit,
      progress,
    };
  }

  return {
    color: AppPalette.incomeGreen,
    label: labels.onTrack,
    progress,
  };
}
