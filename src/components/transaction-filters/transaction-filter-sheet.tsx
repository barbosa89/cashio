import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "@/i18n/localization-provider";

import { ModalSheet } from "@/components/modal-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import type { Category, Tag } from "@/lib/database";

import { FilterSelectField } from "./filter-select-field";
import type { TransactionFilters } from "./filter-types";

type TransactionFilterSheetProps = {
  categories: Category[];
  filters: TransactionFilters;
  isVisible: boolean;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  tags: Tag[];
};

const emptyFilters: TransactionFilters = {
  categoryId: null,
  tagId: null,
};

export function TransactionFilterSheet({
  categories,
  filters,
  isVisible,
  onApply,
  onClose,
  tags,
}: TransactionFilterSheetProps) {
  const { t } = useTranslation();
  const [draftFilters, setDraftFilters] =
    useState<TransactionFilters>(filters);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setDraftFilters(filters);
    resetTransientState();
  }, [filters, isVisible]);

  const categoryItems = useMemo(
    () => [
      { label: t("filters.allCategories"), value: 0 },
      ...categories.map((category) => ({
        label: category.description,
        value: category.id,
      })),
    ],
    [categories, t],
  );

  const tagItems = useMemo(
    () => [
      { label: t("filters.allTags"), value: 0 },
      ...tags.map((tag) => ({ label: tag.description, value: tag.id })),
    ],
    [tags, t],
  );

  function resetTransientState() {
    setIsCategoryOpen(false);
    setIsTagOpen(false);
    setResetSignal((current) => current + 1);
  }

  function closeAndDiscard() {
    setDraftFilters(filters);
    resetTransientState();
    onClose();
  }

  function applyAndClose() {
    onApply(draftFilters);
    resetTransientState();
    onClose();
  }

  function clearAndClose() {
    setDraftFilters(emptyFilters);
    onApply(emptyFilters);
    resetTransientState();
    onClose();
  }

  return (
    <ModalSheet
      closeLabel={t("accessibility.closeFilters")}
      isVisible={isVisible}
      onClose={closeAndDiscard}
      subtitle={t("filters.description")}
      title={t("filters.title")}
    >
      <FilterSelectField
        items={categoryItems}
        label={t("filters.categories")}
        onOpen={() => setIsTagOpen(false)}
        onValueChange={(categoryId) =>
          setDraftFilters((current) => ({ ...current, categoryId }))
        }
        open={isCategoryOpen}
        placeholder={t("filters.allCategories")}
        resetSignal={resetSignal}
        searchPlaceholder={t("transaction.searchCategory")}
        setOpen={setIsCategoryOpen}
        value={draftFilters.categoryId}
        zIndex={isCategoryOpen ? 3000 : 1000}
      />

      <FilterSelectField
        items={tagItems}
        label={t("filters.tags")}
        onOpen={() => setIsCategoryOpen(false)}
        onValueChange={(tagId) =>
          setDraftFilters((current) => ({ ...current, tagId }))
        }
        open={isTagOpen}
        placeholder={t("filters.allTags")}
        resetSignal={resetSignal}
        searchPlaceholder={t("transaction.searchTag")}
        setOpen={setIsTagOpen}
        value={draftFilters.tagId}
        zIndex={isTagOpen ? 3000 : 1000}
      />

      <View style={styles.actions}>
        <SheetButton label={t("filters.clear")} onPress={clearAndClose} />
        <SheetButton label={t("filters.apply")} onPress={applyAndClose} primary />
      </View>
    </ModalSheet>
  );
}

function SheetButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={primary ? "primary" : "surfaceMuted"}
        style={styles.button}
      >
        <ThemedText
          type="smallBold"
          themeColor={primary ? "onPrimary" : "text"}
        >
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  button: {
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
