import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { CashioValidationError } from "@/lib/cashio-repository";
import type { Category, CategoryType } from "@/lib/database";

const CATEGORY_TYPE_OPTIONS: Array<{ label: string; value: CategoryType }> = [
  { label: "Ingreso", value: "income" },
  { label: "Egreso", value: "expense" },
  { label: "Ambas", value: "both" },
];

export function CategoryEditor({ category }: { category?: Category }) {
  const theme = useTheme();
  const { addCategory, editCategory, isLoading } = useCashioData();
  const [description, setDescription] = useState(category?.description ?? "");
  const [categoryType, setCategoryType] = useState<CategoryType | null>(
    category?.type ?? "both",
  );
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDescription(category?.description ?? "");
    setCategoryType(category?.type ?? "both");
  }, [category]);

  function resetForm() {
    setDescription("");
    setCategoryType("both");
    setIsTypeOpen(false);
    setMessage("");
  }

  async function handleSave() {
    setMessage("");
    try {
      if (category) {
        await editCategory(category.id, {
          description,
          type: categoryType ?? "both",
        });
      } else {
        await addCategory({ description, type: categoryType ?? "both" });
      }
      resetForm();
      router.replace("/categories");
    } catch (error) {
      if (error instanceof CashioValidationError) {
        setMessage(error.message);
        return;
      }
      setMessage("No se pudo guardar la categoría.");
    }
  }

  function handleBack() {
    resetForm();
    router.replace("/categories");
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Volver a categorías"
              onPress={handleBack}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView style={[styles.backButton, { borderColor: theme.text }]}>
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {category ? "Editar categoría" : "Nueva categoría"}
            </ThemedText>
          </View>

          <View style={styles.panel}>
            {isTypeOpen && (
              <Pressable
                accessibilityLabel="Cerrar selector"
                onPress={() => setIsTypeOpen(false)}
                style={styles.dropdownBackdrop}
              />
            )}

            <View style={styles.field}>
              <ThemedText type="smallBold">Nombre</ThemedText>
              <TextInput
                onChangeText={setDescription}
                placeholder="Nombre"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { borderColor: theme.backgroundSelected, color: theme.text },
                ]}
                value={description}
              />
            </View>

            <View
              style={[
                styles.field,
                styles.fieldWithDropdown,
                { zIndex: isTypeOpen ? 30 : 10 },
              ]}
            >
              <ThemedText type="smallBold">Tipo</ThemedText>
              <DropDownPicker<CategoryType>
                ArrowDownIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="chevron-down" size={22} />
                  </View>
                )}
                ArrowUpIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="chevron-up" size={22} />
                  </View>
                )}
                TickIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="check" size={20} />
                  </View>
                )}
                dropDownContainerStyle={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                items={CATEGORY_TYPE_OPTIONS}
                labelStyle={styles.dropdownLabel}
                listItemContainerStyle={styles.dropdownItem}
                listItemLabelStyle={{ color: theme.text }}
                listMode="SCROLLVIEW"
                open={isTypeOpen}
                placeholder="Selecciona un tipo"
                placeholderStyle={{ color: theme.textSecondary }}
                selectedItemContainerStyle={{
                  backgroundColor: theme.backgroundSelected,
                }}
                selectedItemLabelStyle={{ color: theme.text, fontWeight: "700" }}
                setOpen={setIsTypeOpen}
                setValue={setCategoryType}
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                textStyle={{ color: theme.text }}
                value={categoryType}
                zIndex={isTypeOpen ? 3000 : 1000}
                zIndexInverse={1000}
              />
            </View>

            {!!message && (
              <ThemedText type="small" themeColor="textSecondary">
                {message}
              </ThemedText>
            )}

            <Pressable
              disabled={isLoading}
              onPress={handleSave}
              style={({ pressed }) => [
                pressed && styles.pressed,
                isLoading && styles.disabled,
              ]}
            >
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="smallBold">
                  {category ? "Guardar cambios" : "Crear categoría"}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: BottomTabInset + Spacing.five,
  },
  safeArea: {
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    paddingTop: Platform.OS === "web" ? Spacing.five : Spacing.three,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  title: {
    flex: 1,
    fontSize: 32,
    lineHeight: 38,
  },
  panel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
    position: "relative",
  },
  dropdownBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  field: {
    gap: Spacing.two,
  },
  fieldWithDropdown: {
    position: "relative",
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dropdown: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  dropdownLabel: {
    fontWeight: "700",
  },
  dropdownMenu: {
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  dropdownItem: {
    minHeight: 44,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
