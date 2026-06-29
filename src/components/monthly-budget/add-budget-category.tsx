import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MonthlyBudgetAvailableCategory } from '@/lib/database';

type AddBudgetCategoryProps = {
  availableCategories: MonthlyBudgetAvailableCategory[];
  onAddCategory: (categoryId: number) => void;
};

export function AddBudgetCategory({ availableCategories, onAddCategory }: AddBudgetCategoryProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const hasAvailableCategories = availableCategories.length > 0;

  function handleAddCategory(categoryId: number) {
    setIsOpen(false);
    onAddCategory(categoryId);
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        disabled={!hasAvailableCategories}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [pressed && styles.pressed, !hasAvailableCategories && styles.disabled]}
      >
        <ThemedView type="backgroundSelected" style={styles.addButton}>
          <AppIcon color={hasAvailableCategories ? AppPalette.incomeGreen : theme.textSecondary} name="plus" size={18} />
          <ThemedText type="smallBold" themeColor={hasAvailableCategories ? 'text' : 'textSecondary'}>
            Agregar categoría
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Modal animationType="fade" transparent visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ThemedView type="background" style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                Agregar categoría
              </ThemedText>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView type="backgroundSelected" style={styles.closeButton}>
                  <AppIcon color={theme.text} name="x" size={18} />
                </ThemedView>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.categoryList}>
              {availableCategories.map((category) => (
                <Pressable
                  accessibilityRole="button"
                  key={category.category_id}
                  onPress={() => handleAddCategory(category.category_id)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <ThemedView type="backgroundSelected" style={styles.categoryOption}>
                    <ThemedText type="smallBold" style={styles.categoryName}>
                      {category.category_description}
                    </ThemedText>
                    <AppIcon color={theme.textSecondary} name="chevron-right" size={18} />
                  </ThemedView>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.one,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  disabled: {
    opacity: 0.55,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    maxHeight: '80%',
    maxWidth: 420,
    padding: Spacing.three,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  categoryList: {
    gap: Spacing.two,
  },
  categoryOption: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  categoryName: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
