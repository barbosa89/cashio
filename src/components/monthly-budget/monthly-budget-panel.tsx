import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MonthlyBudgetData, MonthlyBudgetItem } from '@/lib/database';

import { AddBudgetCategory } from './add-budget-category';
import { BudgetActions } from './budget-actions';
import { BudgetCategoryRow } from './budget-category-row';
import { UnbudgetedExpensesList } from './unbudgeted-expenses-list';

type MonthlyBudgetPanelProps = {
  budgetData: MonthlyBudgetData;
  budgetMessage: string;
  onAddCategory: (categoryId: number) => void;
  onCopyPreviousBudget: () => void;
  onRemoveCategory: (item: MonthlyBudgetItem) => void;
  onSaveAmount: (categoryId: number, plannedAmount: number) => void;
};

export function MonthlyBudgetPanel({
  budgetData,
  budgetMessage,
  onAddCategory,
  onCopyPreviousBudget,
  onRemoveCategory,
  onSaveAmount,
}: MonthlyBudgetPanelProps) {
  const hasBudgetItems = budgetData.items.length > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.actionRow}>
        <BudgetActions budgetMessage={budgetMessage} onCopyPreviousBudget={onCopyPreviousBudget} />
        <AddBudgetCategory
          availableCategories={budgetData.availableCategories}
          onAddCategory={onAddCategory}
        />
      </View>

      {!hasBudgetItems ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Sin categorías presupuestadas
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            Agrega categorías para planear cuánto esperas gastar este mes.
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.rows}>
          {budgetData.items.map((item) => (
            <BudgetCategoryRow
              item={item}
              key={item.category_id}
              onRemoveCategory={onRemoveCategory}
              onSaveAmount={onSaveAmount}
            />
          ))}
        </View>
      )}

      <UnbudgetedExpensesList expenses={budgetData.unbudgetedExpenses} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rows: {
    gap: Spacing.two,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
