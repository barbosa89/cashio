import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import CurrencyInput from 'react-native-currency-input';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MonthlyBudgetProgressRow, MonthlyBudgetSummary } from '@/lib/database';

type BudgetSummaryProps = {
  monthLabel: string;
  summary: MonthlyBudgetSummary;
};

type MonthlyBudgetPanelProps = {
  budgetMessage: string;
  onCopyPreviousBudget: () => void;
  onSaveBudget: (categoryId: number, plannedAmount: number) => void;
  rows: MonthlyBudgetProgressRow[];
  summary: MonthlyBudgetSummary;
};

type BudgetCategoryRowProps = {
  onSaveBudget: (categoryId: number, plannedAmount: number) => void;
  row: MonthlyBudgetProgressRow;
};

export function buildBudgetSummary(rows: MonthlyBudgetProgressRow[]): MonthlyBudgetSummary {
  return rows.reduce(
    (summary, row) => {
      const planned = row.planned_amount;
      const spent = row.spent_amount;

      return {
        planned_total: summary.planned_total + planned,
        spent_total: summary.spent_total + spent,
        remaining_total: summary.remaining_total + planned - spent,
        unbudgeted_expense_total:
          summary.unbudgeted_expense_total + (row.has_budget === 0 && spent > 0 ? spent : 0),
      };
    },
    {
      planned_total: 0,
      remaining_total: 0,
      spent_total: 0,
      unbudgeted_expense_total: 0,
    }
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function BudgetSummary({ monthLabel, summary }: BudgetSummaryProps) {
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
            $ {formatMoney(summary.remaining_total)}
          </ThemedText>
        </View>
        <View style={styles.summaryDetailRow}>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            Presupuestado: $ {formatMoney(summary.planned_total)}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            Gastado: $ {formatMoney(summary.spent_total)}
          </ThemedText>
        </View>
        {summary.unbudgeted_expense_total > 0 && (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.summaryDetail}>
            Sin presupuesto: $ {formatMoney(summary.unbudgeted_expense_total)}
          </ThemedText>
        )}
      </ThemedView>
    </View>
  );
}

export function MonthlyBudgetPanel({
  budgetMessage,
  onCopyPreviousBudget,
  onSaveBudget,
  rows,
  summary,
}: MonthlyBudgetPanelProps) {
  const hasBudgetRows = rows.some((row) => row.has_budget === 1 || row.spent_amount > 0);

  return (
    <View style={styles.budgetPanel}>
      <View style={styles.budgetActions}>
        <BudgetActionButton label="Copiar mes anterior" onPress={onCopyPreviousBudget} />
      </View>

      {!!budgetMessage && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.budgetMessage}>
          {budgetMessage}
        </ThemedText>
      )}

      {!hasBudgetRows && summary.planned_total === 0 ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Sin presupuesto
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            Asigna valores a las categorías o copia el mes anterior.
          </ThemedText>
        </ThemedView>
      ) : null}

      <View style={styles.budgetRows}>
        {rows.map((row) => (
          <BudgetCategoryRow key={row.category_id} onSaveBudget={onSaveBudget} row={row} />
        ))}
      </View>
    </View>
  );
}

function BudgetCategoryRow({ onSaveBudget, row }: BudgetCategoryRowProps) {
  const theme = useTheme();
  const [draftAmount, setDraftAmount] = useState<number | null>(
    row.planned_amount > 0 ? row.planned_amount : null
  );
  const plannedAmount = row.planned_amount;
  const spentAmount = row.spent_amount;
  const remainingAmount = plannedAmount - spentAmount;
  const progress = plannedAmount > 0 ? spentAmount / plannedAmount : spentAmount > 0 ? 1 : 0;
  const progressWidth: DimensionValue = `${Math.min(Math.max(progress * 100, spentAmount > 0 ? 4 : 0), 100)}%`;
  const isUnbudgeted = row.has_budget === 0 && spentAmount > 0;
  const isOver = plannedAmount > 0 && spentAmount > plannedAmount;
  const isNearLimit = plannedAmount > 0 && !isOver && progress >= 0.8;
  const statusLabel = isUnbudgeted
    ? 'Sin presupuesto'
    : isOver
      ? 'Excedido'
      : isNearLimit
        ? 'Cerca del límite'
        : 'En curso';
  const statusColor =
    isOver || isUnbudgeted ? AppPalette.brandOrange : isNearLimit ? '#eab308' : AppPalette.incomeGreen;

  useEffect(() => {
    setDraftAmount(row.planned_amount > 0 ? row.planned_amount : null);
  }, [row.planned_amount]);

  function commitBudget() {
    const nextAmount = draftAmount ?? 0;

    if (nextAmount === row.planned_amount) {
      return;
    }

    onSaveBudget(row.category_id, nextAmount);
  }

  return (
    <ThemedView type="backgroundSelected" style={styles.budgetRow}>
      <View style={styles.budgetRowHeader}>
        <View style={styles.budgetCategoryCopy}>
          <ThemedText type="smallBold" style={styles.budgetCategoryName} numberOfLines={1}>
            {row.category_description}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {statusLabel}
          </ThemedText>
        </View>
        <CurrencyInput
          delimiter="."
          keyboardType="numeric"
          minValue={0}
          onBlur={commitBudget}
          onChangeValue={setDraftAmount}
          placeholder="$ 0"
          placeholderTextColor={theme.textSecondary}
          precision={0}
          prefix="$ "
          separator=","
          style={[styles.budgetInput, { borderColor: theme.background, color: theme.text }]}
          value={draftAmount}
        />
      </View>

      <View style={styles.budgetMetaRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.budgetMetaText}>
          Gastado: $ {formatMoney(spentAmount)}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.budgetMetaText}>
          Disponible: $ {formatMoney(remainingAmount)}
        </ThemedText>
      </View>

      <View style={[styles.budgetTrack, { backgroundColor: theme.background }]}>
        <View style={[styles.budgetBar, { backgroundColor: statusColor, width: progressWidth }]} />
      </View>
    </ThemedView>
  );
}

function BudgetActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundSelected" style={styles.actionButton}>
        <AppIcon color={AppPalette.brandOrange} name="copy" size={18} />
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
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
  budgetPanel: {
    gap: Spacing.three,
  },
  budgetActions: {
    alignItems: 'flex-start',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  budgetMessage: {
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 360,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  emptyText: {
    textAlign: 'center',
  },
  budgetRows: {
    gap: Spacing.three,
  },
  budgetRow: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  budgetRowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  budgetCategoryCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  budgetCategoryName: {
    fontSize: 16,
    lineHeight: 20,
  },
  budgetInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '700',
    height: 40,
    minWidth: 112,
    paddingHorizontal: Spacing.two,
    textAlign: 'right',
  },
  budgetMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  budgetMetaText: {
    flex: 1,
    minWidth: 0,
  },
  budgetTrack: {
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  budgetBar: {
    borderRadius: 6,
    height: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
});
