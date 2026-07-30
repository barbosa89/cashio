import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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
  const theme = useTheme();
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
    <Modal
      animationType="slide"
      onRequestClose={closeAndDiscard}
      transparent
      visible={isVisible}
    >
      <Pressable style={styles.backdrop} onPress={closeAndDiscard}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.header}>
              <View>
                <ThemedText type="subtitle" style={styles.title}>
                  {t("filters.title")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("filters.description")}
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel={t("accessibility.closeFilters")}
                onPress={closeAndDiscard}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon color={theme.text} name="x" size={22} />
              </Pressable>
            </View>

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
              <SheetButton label={t("filters.apply")} onPress={applyAndClose} />
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundSelected" style={styles.button}>
        <ThemedText type="smallBold">{label}</ThemedText>
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
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-start",
    padding: Spacing.three,
    paddingTop: Spacing.six,
  },
  button: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  panel: {
    alignSelf: "center",
    borderRadius: Spacing.two,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: "100%",
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
});
