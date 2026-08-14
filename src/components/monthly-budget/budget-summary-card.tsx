import { StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocalization } from '@/i18n/localization-provider';
import type { MonthlyBudgetSummary } from '@/lib/database';

import { formatBudgetMoney } from './budget-formatters';

type BudgetSummaryCardProps = {
  summary: MonthlyBudgetSummary;
};

export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const { t } = useTranslation();
  const { languageTag } = useLocalization();

  return (
    <View style={styles.summaryWrap}>
      <ThemedView type="backgroundSelected" style={styles.summaryPanel}>
        <View style={styles.summaryMainRow}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            {t('budget.available')}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.summaryAmount}>
            $ {formatBudgetMoney(summary.remaining_total, languageTag)}
          </ThemedText>
        </View>
        <View style={styles.summaryDetailRow}>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            {t('budget.planned')}: $ {formatBudgetMoney(summary.planned_total, languageTag)}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            {t('budget.spent')}: $ {formatBudgetMoney(summary.spent_total, languageTag)}
          </ThemedText>
        </View>
        {summary.unbudgeted_expense_total > 0 && (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.summaryDetail}>
            {t('budget.unbudgeted')}: ${' '}
            {formatBudgetMoney(summary.unbudgeted_expense_total, languageTag)}
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
