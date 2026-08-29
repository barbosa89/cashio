import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/localization-provider";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";
import CurrencyInput from "react-native-currency-input";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getNumberSeparators } from "@/i18n/formatters";
import { useLocalization } from "@/i18n/localization-provider";
import type { MonthlyBudgetItem } from "@/lib/database";

import { formatBudgetMoney, getBudgetStatus } from "./budget-formatters";

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
  const { t } = useTranslation();
  const { languageTag } = useLocalization();
  const numberSeparators = getNumberSeparators(languageTag);
  const [draftAmount, setDraftAmount] = useState<number | null>(
    item.planned_amount,
  );
  const [isEditing, setIsEditing] = useState(false);
  const status = getBudgetStatus(item, {
    nearLimit: t("budget.nearLimit"),
    onTrack: t("budget.onTrack"),
    overBudget: t("budget.overBudget"),
  });
  const progressWidth: DimensionValue = `${Math.min(
    Math.max(status.progress * 100, item.spent_amount > 0 ? 4 : 0),
    100,
  )}%`;

  useEffect(() => {
    setDraftAmount(item.planned_amount);
    setIsEditing(false);
  }, [item.planned_amount]);

  function commitBudget() {
    const nextAmount = draftAmount ?? 0;

    setDraftAmount(nextAmount);

    if (nextAmount !== item.planned_amount) {
      onSaveAmount(item.category_id, nextAmount);
    }

    setIsEditing(false);
  }

  function handleEditAmount() {
    if (!isEditing) {
      if (draftAmount === 0) {
        setDraftAmount(null);
      }

      setIsEditing(true);
      return;
    }

    commitBudget();
  }

  return (
    <ThemedView type="backgroundSelected" style={styles.row}>
      <View style={styles.header}>
        <View style={styles.categoryCopy}>
          <ThemedText
            type="smallBold"
            style={styles.categoryName}
            numberOfLines={2}
          >
            {item.category_description}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {status.label}
          </ThemedText>
        </View>

        {readOnly ? (
          <ThemedText type="smallBold" style={styles.readOnlyAmount}>
            $ {formatBudgetMoney(item.planned_amount, languageTag)}
          </ThemedText>
        ) : (
          <Pressable
            accessibilityLabel={t("accessibility.removeBudgetCategory", {
              name: item.category_description,
            })}
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
            delimiter={numberSeparators.delimiter}
            editable={isEditing}
            key={isEditing ? "budget-amount-edit" : "budget-amount-display"}
            keyboardType="numeric"
            minValue={0}
            onChangeValue={setDraftAmount}
            onSubmitEditing={commitBudget}
            placeholder={isEditing ? "" : "$ 0"}
            placeholderTextColor={theme.textSecondary}
            precision={0}
            prefix={isEditing ? "" : "$ "}
            returnKeyType="done"
            separator={numberSeparators.separator}
            style={[
              styles.input,
              {
                backgroundColor: isEditing
                  ? theme.background
                  : theme.backgroundSelected,
                borderColor: isEditing ? theme.textSecondary : theme.background,
                color: theme.text,
              },
            ]}
            value={draftAmount}
          />
          <Pressable
            accessibilityLabel={
              isEditing
                ? t("budget.saveNamed", { name: item.category_description })
                : t("budget.editNamed", { name: item.category_description })
            }
            accessibilityRole="button"
            onPress={handleEditAmount}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="background" style={styles.iconButton}>
              <AppIcon
                color={isEditing ? status.color : theme.textSecondary}
                name={isEditing ? "check" : "edit-3"}
                size={18}
              />
            </ThemedView>
          </Pressable>
        </View>
      )}

      <View style={styles.metaRow}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.metaText}
        >
          {t("budget.spent")}: ${" "}
          {formatBudgetMoney(item.spent_amount, languageTag)}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.metaText}>
          {t("budget.available")}: ${" "}
          {formatBudgetMoney(item.remaining_amount, languageTag)}
        </ThemedText>
      </View>

      <View style={[styles.track, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.bar,
            { backgroundColor: status.color, width: progressWidth },
          ]}
        />
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
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
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
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: Spacing.two,
    textAlign: "right",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  readOnlyAmount: {
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  metaRow: {
    alignItems: "stretch",
    gap: Spacing.one,
  },
  metaText: {
    minWidth: 0,
    width: "100%",
  },
  track: {
    borderRadius: 6,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  bar: {
    borderRadius: 6,
    height: "100%",
  },
  pressed: {
    opacity: 0.7,
  },
});
