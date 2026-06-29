import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MonthlyBudgetUnbudgetedExpense } from '@/lib/database';

import { formatBudgetMoney } from './budget-formatters';

type UnbudgetedExpensesListProps = {
  expenses: MonthlyBudgetUnbudgetedExpense[];
};

export function UnbudgetedExpensesList({ expenses }: UnbudgetedExpensesListProps) {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" style={styles.title}>
        Gastos sin presupuesto
      </ThemedText>
      <View style={styles.rows}>
        {expenses.map((expense) => (
          <ThemedView key={expense.category_id} type="backgroundSelected" style={styles.row}>
            <ThemedText type="smallBold" style={styles.categoryName} numberOfLines={1}>
              {expense.category_description}
            </ThemedText>
            <ThemedText type="smallBold">$ {formatBudgetMoney(expense.spent_amount)}</ThemedText>
          </ThemedView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  categoryName: {
    flex: 1,
    minWidth: 0,
  },
});

