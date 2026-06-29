import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MonthlyBudgetSummary } from '@/lib/database';

import { formatBudgetMoney } from './budget-formatters';

type BudgetSummaryCardProps = {
  monthLabel: string;
  summary: MonthlyBudgetSummary;
};

export function BudgetSummaryCard({ monthLabel, summary }: BudgetSummaryCardProps) {
  return (
    <View style={styles.summaryWrap}>
      <ThemedText type="smallBold" style={styles.summaryMonth}>
        {monthLabel}
      </ThemedText>
      <ThemedView type="backgroundSelected" style={styles.summaryPanel}>
        <View style={styles.summaryMainRow}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            Disponible
          </ThemedText>
          <ThemedText type="subtitle" style={styles.summaryAmount}>
            $ {formatBudgetMoney(summary.remaining_total)}
          </ThemedText>
        </View>
        <View style={styles.summaryDetailRow}>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            Presupuestado: $ {formatBudgetMoney(summary.planned_total)}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            Gastado: $ {formatBudgetMoney(summary.spent_total)}
          </ThemedText>
        </View>
        {summary.unbudgeted_expense_total > 0 && (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.summaryDetail}>
            Sin presupuesto: $ {formatBudgetMoney(summary.unbudgeted_expense_total)}
          </ThemedText>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryWrap: {
    gap: Spacing.one,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  summaryMonth: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  summaryPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  summaryMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  summaryAmount: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'right',
  },
  summaryDetailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  summaryDetail: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});

