import { AppPalette } from '@/constants/theme';
import type { MonthlyBudgetItem } from '@/lib/database';

export type BudgetStatus = {
  color: string;
  label: string;
  progress: number;
};

export function formatBudgetMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function getBudgetStatus(item: MonthlyBudgetItem): BudgetStatus {
  const progress =
    item.planned_amount > 0 ? item.spent_amount / item.planned_amount : item.spent_amount > 0 ? 1 : 0;
  const isOver = item.planned_amount >= 0 && item.spent_amount > item.planned_amount;
  const isNearLimit = item.planned_amount > 0 && !isOver && progress >= 0.8;

  if (isOver) {
    return {
      color: AppPalette.brandOrange,
      label: 'Excedido',
      progress,
    };
  }

  if (isNearLimit) {
    return {
      color: '#eab308',
      label: 'Cerca del límite',
      progress,
    };
  }

  return {
    color: AppPalette.incomeGreen,
    label: 'En curso',
    progress,
  };
}

