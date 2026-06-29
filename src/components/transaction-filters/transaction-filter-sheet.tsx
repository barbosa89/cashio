import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

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
      { label: "Todas", value: 0 },
      ...categories.map((category) => ({
        label: category.description,
        value: category.id,
      })),
    ],
    [categories],
  );

  const tagItems = useMemo(
    () => [
      { label: "Todos", value: 0 },
      ...tags.map((tag) => ({ label: tag.description, value: tag.id })),
    ],
    [tags],
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
                  Filtros
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Refina el listado por categoría y tag.
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Cerrar filtros"
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
              label="Categorías"
              onOpen={() => setIsTagOpen(false)}
              onValueChange={(categoryId) =>
                setDraftFilters((current) => ({ ...current, categoryId }))
              }
              open={isCategoryOpen}
              placeholder="Todas"
              resetSignal={resetSignal}
              searchPlaceholder="Buscar categoría"
              setOpen={setIsCategoryOpen}
              value={draftFilters.categoryId}
              zIndex={isCategoryOpen ? 3000 : 1000}
            />

            <FilterSelectField
              items={tagItems}
              label="Tags"
              onOpen={() => setIsCategoryOpen(false)}
              onValueChange={(tagId) =>
                setDraftFilters((current) => ({ ...current, tagId }))
              }
              open={isTagOpen}
              placeholder="Todos"
              resetSignal={resetSignal}
              searchPlaceholder="Buscar tag"
              setOpen={setIsTagOpen}
              value={draftFilters.tagId}
              zIndex={isTagOpen ? 3000 : 1000}
            />

            <View style={styles.actions}>
              <SheetButton label="Limpiar" onPress={clearAndClose} />
              <SheetButton label="Aplicar" onPress={applyAndClose} />
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
