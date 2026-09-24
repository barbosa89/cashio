import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import type { MonthlyBudgetData, MonthlyBudgetItem } from '@/lib/database';

import { AddBudgetCategory } from './add-budget-category';
import { BudgetActions } from './budget-actions';
import { BudgetCategoryRow } from './budget-category-row';
import { UnbudgetedExpensesList } from './unbudgeted-expenses-list';

type MonthlyBudgetPanelProps = {
  autoCopyPreviousMonthBudget: boolean;
  budgetData: MonthlyBudgetData;
  budgetMessage: string;
  onAddCategory: (categoryId: number) => void;
  onCopyPreviousBudget: () => void;
  onRemoveCategory: (item: MonthlyBudgetItem) => void;
  onSaveAmount: (categoryId: number, plannedAmount: number) => void;
  readOnly?: boolean;
};

export function MonthlyBudgetPanel({
  autoCopyPreviousMonthBudget,
  budgetData,
  budgetMessage,
  onAddCategory,
  onCopyPreviousBudget,
  onRemoveCategory,
  onSaveAmount,
  readOnly = false,
}: MonthlyBudgetPanelProps) {
  const { t } = useTranslation();
  const hasBudgetItems = budgetData.items.length > 0;

  return (
    <View style={styles.panel}>
      {readOnly ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.readOnlyText}>
          {t('budget.consolidatedDescription')}
        </ThemedText>
      ) : (
        <View style={styles.actionRow}>
          {!autoCopyPreviousMonthBudget && (
            <BudgetActions onCopyPreviousBudget={onCopyPreviousBudget} />
          )}
          <AddBudgetCategory
            availableCategories={budgetData.availableCategories}
            onAddCategory={onAddCategory}
          />
        </View>
      )}

      {!!budgetMessage && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {budgetMessage}
        </ThemedText>
      )}

      {!hasBudgetItems ? (
        <ThemedView type="surfaceMuted" style={styles.emptyState}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            {readOnly ? t('budget.noConsolidated') : t('budget.noCategories')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            {readOnly
              ? t('budget.noConsolidatedDescription')
              : t('budget.noCategoriesDescription')}
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
              readOnly={readOnly}
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
  readOnlyText: {
    textAlign: 'center',
  },
  message: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: Radius.card,
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 300,
    padding: Spacing.three,
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
