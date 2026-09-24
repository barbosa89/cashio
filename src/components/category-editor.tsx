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
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, DROPDOWN_LIST_MODE, MaxPhoneContentWidth, Radius, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import type { Category, CategoryType } from "@/lib/database";

export function CategoryEditor({ category }: { category?: Category }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const categoryTypeOptions: Array<{ label: string; value: CategoryType }> = [
    { label: t("common.income"), value: "income" },
    { label: t("common.expense"), value: "expense" },
    { label: t("common.both"), value: "both" },
  ];
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
      setMessage(translateError(error, t));
    }
  }

  function handleBack() {
    resetForm();
    router.replace("/categories");
  }

  return (
    <ThemedView type="canvas" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.backToCategories")}
              accessibilityRole="button"
              onPress={handleBack}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="surface" style={[styles.backButton, { borderColor: theme.border }]}>
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {category ? t("categoryEditor.editTitle") : t("categoryEditor.newTitle")}
            </ThemedText>
          </View>

          <ThemedView type="surface" style={styles.panel}>
            {isTypeOpen && (
              <Pressable
                accessibilityLabel={t("accessibility.closeSelector")}
                onPress={() => setIsTypeOpen(false)}
                style={styles.dropdownBackdrop}
              />
            )}

            <View style={styles.field}>
              <ThemedText type="smallBold">{t("categoryEditor.name")}</ThemedText>
              <TextInput
                accessibilityLabel={t("categoryEditor.name")}
                onChangeText={setDescription}
                placeholder={t("categoryEditor.name")}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { backgroundColor: theme.surfaceRaised, borderColor: theme.border, color: theme.text },
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
              <ThemedText type="smallBold">{t("categoryEditor.type")}</ThemedText>
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
                CloseIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="x" size={24} />
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
                    backgroundColor: theme.surfaceRaised,
                    borderColor: theme.border,
                  },
                ]}
                items={categoryTypeOptions}
                labelStyle={styles.dropdownLabel}
                listItemContainerStyle={styles.dropdownItem}
                listItemLabelStyle={{ color: theme.text }}
                listMode={DROPDOWN_LIST_MODE}
                modalAnimationType="slide"
                modalContentContainerStyle={[
                  styles.dropdownModal,
                  { backgroundColor: theme.surface },
                ]}
                modalTitle={t("categoryEditor.selectType")}
                modalTitleStyle={{ color: theme.text }}
                open={isTypeOpen}
                placeholder={t("categoryEditor.selectType")}
                placeholderStyle={{ color: theme.textSecondary }}
                selectedItemContainerStyle={{
                  backgroundColor: theme.primaryContainer,
                }}
                selectedItemLabelStyle={{ color: theme.text, fontWeight: "700" }}
                setOpen={setIsTypeOpen}
                setValue={setCategoryType}
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: theme.surfaceRaised,
                    borderColor: theme.border,
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
              accessibilityRole="button"
              accessibilityState={{ busy: isLoading, disabled: isLoading }}
              disabled={isLoading}
              onPress={handleSave}
              style={({ pressed }) => [
                pressed && styles.pressed,
                isLoading && styles.disabled,
              ]}
            >
              <ThemedView type="primary" style={styles.saveButton}>
                <ThemedText type="smallBold" themeColor="onPrimary">
                  {category ? t("categoryEditor.save") : t("categoryEditor.create")}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
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
    maxWidth: MaxPhoneContentWidth,
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
    borderRadius: Radius.control,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    flex: 1,
  },
  panel: {
    borderRadius: Radius.card,
    gap: Spacing.four,
    padding: Spacing.four,
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
    borderRadius: Radius.control,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dropdown: {
    borderRadius: Radius.control,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  dropdownLabel: {
    fontWeight: "700",
  },
  dropdownMenu: {
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  dropdownModal: {
    padding: Spacing.three,
  },
  dropdownItem: {
    minHeight: 44,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    minHeight: 48,
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
