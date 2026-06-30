import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import CurrencyInput from 'react-native-currency-input';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MonthlyBudgetItem } from '@/lib/database';

import { formatBudgetMoney, getBudgetStatus } from './budget-formatters';

type BudgetCategoryRowProps = {
  item: MonthlyBudgetItem;
  onRemoveCategory: (item: MonthlyBudgetItem) => void;
  onSaveAmount: (categoryId: number, plannedAmount: number) => void;
  readOnly?: boolean;
};

export function BudgetCategoryRow({
  item,
  onRemoveCategory,
  onSaveAmount,
  readOnly = false,
}: BudgetCategoryRowProps) {
  const theme = useTheme();
  const [draftAmount, setDraftAmount] = useState<number | null>(item.planned_amount);
  const [isEditing, setIsEditing] = useState(false);
  const status = getBudgetStatus(item);
  const progressWidth: DimensionValue = `${Math.min(
    Math.max(status.progress * 100, item.spent_amount > 0 ? 4 : 0),
    100
  )}%`;

  useEffect(() => {
    setDraftAmount(item.planned_amount);
    setIsEditing(false);
  }, [item.planned_amount]);

  function commitBudget() {
    const nextAmount = draftAmount ?? 0;

    if (nextAmount !== item.planned_amount) {
      onSaveAmount(item.category_id, nextAmount);
    }

    setIsEditing(false);
  }

  function handleEditAmount() {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    commitBudget();
  }

  return (
    <ThemedView type="backgroundSelected" style={styles.row}>
      <View style={styles.header}>
        <View style={styles.categoryCopy}>
          <ThemedText type="smallBold" style={styles.categoryName} numberOfLines={2}>
            {item.category_description}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {status.label}
          </ThemedText>
        </View>

        {readOnly ? (
          <ThemedText type="smallBold" style={styles.readOnlyAmount}>
            $ {formatBudgetMoney(item.planned_amount)}
          </ThemedText>
        ) : (
          <Pressable
            accessibilityLabel={`Quitar ${item.category_description} del presupuesto`}
            accessibilityRole="button"
            onPress={() => onRemoveCategory(item)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="background" style={styles.iconButton}>
              <AppIcon color={theme.textSecondary} name="x" size={18} />
            </ThemedView>
          </Pressable>
        )}
      </View>

      {!readOnly && (
        <View style={styles.amountRow}>
          <CurrencyInput
            delimiter="."
            editable={isEditing}
            keyboardType="numeric"
            minValue={0}
            onChangeValue={setDraftAmount}
            placeholder="$ 0"
            placeholderTextColor={theme.textSecondary}
            precision={0}
            prefix="$ "
            separator=","
            style={[
              styles.input,
              {
                backgroundColor: isEditing ? theme.background : theme.backgroundSelected,
                borderColor: isEditing ? theme.textSecondary : theme.background,
                color: theme.text,
              },
            ]}
            value={draftAmount}
          />
          <Pressable
            accessibilityLabel={
              isEditing
                ? `Guardar presupuesto de ${item.category_description}`
                : `Editar presupuesto de ${item.category_description}`
            }
            accessibilityRole="button"
            onPress={handleEditAmount}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="background" style={styles.iconButton}>
              <AppIcon
                color={isEditing ? status.color : theme.textSecondary}
                name={isEditing ? 'check' : 'edit-3'}
                size={18}
              />
            </ThemedView>
          </Pressable>
        </View>
      )}

      <View style={styles.metaRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
          Gastado: $ {formatBudgetMoney(item.spent_amount)}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.metaText}>
          Disponible: $ {formatBudgetMoney(item.remaining_amount)}
        </ThemedText>
      </View>

      <View style={[styles.track, { backgroundColor: theme.background }]}>
        <View style={[styles.bar, { backgroundColor: status.color, width: progressWidth }]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.two,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  categoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 15,
    lineHeight: 19,
  },
  amountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    height: 38,
    minWidth: 0,
    paddingHorizontal: Spacing.two,
    textAlign: 'right',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  readOnlyAmount: {
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  metaRow: {
    alignItems: 'stretch',
    gap: Spacing.one,
  },
  metaText: {
    minWidth: 0,
    width: '100%',
  },
  track: {
    borderRadius: 6,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    borderRadius: 6,
    height: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
});
