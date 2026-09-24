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
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxPhoneContentWidth, Radius, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import type { Tag } from "@/lib/database";

export function TagEditor({ tag }: { tag?: Tag }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { addTag, editTag, isLoading } = useCashioData();
  const [description, setDescription] = useState(tag?.description ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDescription(tag?.description ?? "");
  }, [tag]);

  function resetForm() {
    setDescription("");
    setMessage("");
  }

  async function handleSave() {
    setMessage("");
    try {
      if (tag) {
        await editTag(tag.id, { description });
      } else {
        await addTag({ description });
      }
      resetForm();
      router.replace("/tags");
    } catch (error) {
      setMessage(translateError(error, t));
    }
  }

  function handleBack() {
    resetForm();
    router.replace("/tags");
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
              accessibilityLabel={t("accessibility.backToTags")}
              accessibilityRole="button"
              onPress={handleBack}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView
                type="surface"
                style={[styles.backButton, { borderColor: theme.border }]}
              >
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {tag ? t("tagEditor.editTitle") : t("tagEditor.newTitle")}
            </ThemedText>
          </View>

          <ThemedView type="surface" style={styles.panel}>
            <View style={styles.field}>
              <ThemedText type="smallBold">{t("tagEditor.name")}</ThemedText>
              <TextInput
                accessibilityLabel={t("tagEditor.name")}
                onChangeText={setDescription}
                placeholder={t("tagEditor.name")}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { backgroundColor: theme.surfaceRaised, borderColor: theme.border, color: theme.text },
                ]}
                value={description}
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
                  {tag ? t("tagEditor.save") : t("tagEditor.create")}
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
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.control,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
