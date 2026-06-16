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

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { CashioValidationError } from "@/lib/cashio-repository";
import type { Tag } from "@/lib/database";

export function TagEditor({ tag }: { tag?: Tag }) {
  const theme = useTheme();
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
      if (error instanceof CashioValidationError) {
        setMessage(error.message);
        return;
      }
      setMessage("No se pudo guardar el tag.");
    }
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
              accessibilityLabel="Volver a tags"
              onPress={() => router.replace("/tags")}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView
                style={[styles.backButton, { borderColor: theme.text }]}
              >
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {tag ? "Editar tag" : "Nuevo tag"}
            </ThemedText>
          </View>

          <View style={styles.panel}>
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
                  {tag ? "Guardar cambios" : "Crear tag"}
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
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
