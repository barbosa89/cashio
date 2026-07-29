import type { MonthlySummaryRow } from '@/lib/database';
import { capitalizeLocalized, formatCompactNumber, formatMonthName, formatNumber } from '@/i18n/formatters';

export type CategoryChartPoint = {
  amount: number;
  color: string;
  label: string;
};

export type MonthlyChartSummary = {
  expense: number;
};

export type AnnualChartPoint = {
  expense: number;
  income: number;
  label: string;
  month: number;
};

export const CHART_CATEGORY_COLORS = [
  '#f97316',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
  '#eab308',
];

export function formatMoney(value: number, locale: string) {
  return formatNumber(value, locale);
}

export function formatCompactAmount(value: number, locale: string) {
  return Math.abs(value) >= 1_000
    ? formatCompactNumber(value, locale)
    : formatMoney(value, locale);
}

export function getTopCategoriesWithOther(
  categoryData: CategoryChartPoint[],
  limit: number,
  otherLabel: string,
): CategoryChartPoint[] {
  if (categoryData.length <= limit) {
    return categoryData;
  }

  const topCategories = categoryData.slice(0, limit);
  const otherAmount = categoryData
    .slice(limit)
    .reduce((total, category) => total + category.amount, 0);

  return [
    ...topCategories,
    {
      amount: otherAmount,
      color: CHART_CATEGORY_COLORS[limit % CHART_CATEGORY_COLORS.length],
      label: otherLabel,
    },
  ];
}

export function buildAnnualIncomeExpenseSeries(
  monthlySummaries: MonthlySummaryRow[],
  year: number,
  locale: string,
): AnnualChartPoint[] {
  const summariesByMonth = new Map<string, MonthlySummaryRow>();
  const yearPrefix = `${year}-`;

  for (const summary of monthlySummaries) {
    if (summary.month.startsWith(yearPrefix)) {
      summariesByMonth.set(summary.month, summary);
    }
  }

  const data: AnnualChartPoint[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const summary = summariesByMonth.get(monthKey);

    data.push({
      expense: summary?.expense_total ?? 0,
      income: summary?.income_total ?? 0,
      label: capitalizeLocalized(formatMonthName(year, month, locale, 'short'), locale),
      month,
    });
  }

  return data;
}

export function getAnnualMaxValue(data: AnnualChartPoint[]) {
  let maxValue = 0;

  for (const item of data) {
    if (item.income > maxValue) {
      maxValue = item.income;
    }

    if (item.expense > maxValue) {
      maxValue = item.expense;
    }
  }

  return maxValue;
}

export function buildAnnualAxisTicks(maxValue: number) {
  return [maxValue, (maxValue * 2) / 3, maxValue / 3, 0];
}
