import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocalization } from '@/i18n/localization-provider';
import type { MonthlyBudgetUnbudgetedExpense } from '@/lib/database';

import { formatBudgetMoney } from './budget-formatters';

type UnbudgetedExpensesListProps = {
  expenses: MonthlyBudgetUnbudgetedExpense[];
};

export function UnbudgetedExpensesList({ expenses }: UnbudgetedExpensesListProps) {
  const { t } = useTranslation();
  const { languageTag } = useLocalization();

  if (expenses.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" style={styles.title}>
        {t('budget.unbudgetedExpenses')}
      </ThemedText>
      <View style={styles.rows}>
        {expenses.map((expense) => (
          <ThemedView key={expense.category_id} type="surfaceMuted" style={styles.row}>
            <ThemedText type="smallBold" style={styles.categoryName} numberOfLines={1}>
              {expense.category_description}
            </ThemedText>
            <ThemedText type="smallBold">
              $ {formatBudgetMoney(expense.spent_amount, languageTag)}
            </ThemedText>
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
