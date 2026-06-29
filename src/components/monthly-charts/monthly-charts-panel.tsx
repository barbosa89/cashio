import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MonthlySummaryRow } from '@/lib/database';

import { AnnualIncomeExpenseBars } from './annual-income-expense-bars';
import { CategoryExpenseBars } from './category-expense-bars';
import { ChartCard } from './chart-card';
import { type CategoryChartPoint, type MonthlyChartSummary } from './chart-formatters';
import { ExpenseDonutChart } from './expense-donut-chart';

type MonthlyChartsPanelProps = {
  expenseCategoryData: CategoryChartPoint[];
  monthlySummaries: MonthlySummaryRow[];
  summary: MonthlyChartSummary;
  visibleYear: number;
};

export function MonthlyChartsPanel({
  expenseCategoryData,
  monthlySummaries,
  summary,
  visibleYear,
}: MonthlyChartsPanelProps) {
  return (
    <View style={styles.panel}>
      <AnnualIncomeExpenseBars
        monthlySummaries={monthlySummaries}
        year={visibleYear}
      />

      {expenseCategoryData.length === 0 ? (
        <MonthlyExpenseEmptyChart />
      ) : (
        <>
          <ExpenseDonutChart data={expenseCategoryData} total={summary.expense} />
          <CategoryExpenseBars data={expenseCategoryData} total={summary.expense} />
        </>
      )}
    </View>
  );
}

function MonthlyExpenseEmptyChart() {
  return (
    <ChartCard title="Egresos por categoría">
      <ThemedView style={styles.emptyState}>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Sin egresos este mes.
        </ThemedText>
      </ThemedView>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  emptyText: {
    textAlign: 'center',
  },
});
