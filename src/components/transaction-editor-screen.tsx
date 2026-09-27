import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { TransactionForm } from "@/components/transaction-form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxPhoneContentWidth,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/localization-provider";
import type { CreateTransactionInput } from "@/lib/cashio-repository";

type TransactionEditorScreenProps = {
  accountOptions?: { id: number; name: string }[];
  formKey?: string | number;
  initialAccountId?: number | null;
  initialValues?: CreateTransactionInput | null;
  mode?: "create" | "edit";
  onSaved?: () => void;
  onSubmit?: (values: CreateTransactionInput) => Promise<void>;
  title: string;
};

export function TransactionEditorScreen({
  accountOptions = [],
  formKey,
  initialAccountId = null,
  initialValues = null,
  mode = "create",
  onSaved,
  onSubmit,
  title,
}: Readonly<TransactionEditorScreenProps>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const allowNavigationRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!isDirty || allowNavigationRef.current) {
          return;
        }

        event.preventDefault();
        const discard = () => {
          allowNavigationRef.current = true;
          navigation.dispatch(event.data.action);
        };

        if (Platform.OS === "web") {
          if (confirm(t("transaction.discardMessage"))) {
            discard();
          }
          return;
        }

        Alert.alert(
          t("transaction.discardTitle"),
          t("transaction.discardMessage"),
          [
            { style: "cancel", text: t("transaction.keepEditing") },
            {
              onPress: discard,
              style: "destructive",
              text: t("transaction.discard"),
            },
          ],
        );
      }),
    [isDirty, navigation, t],
  );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  }

  function handleSaved() {
    allowNavigationRef.current = true;
    onSaved?.();
  }

  return (
    <ThemedView type="canvas" style={styles.container}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.backToTransactions")}
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
              {title}
            </ThemedText>
          </View>

          <TransactionForm
            accountOptions={accountOptions}
            key={formKey}
            initialAccountId={initialAccountId}
            initialValues={initialValues}
            mode={mode}
            onDirtyChange={setIsDirty}
            onSaved={handleSaved}
            onSubmit={onSubmit}
          />
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    paddingTop: Platform.OS === "web" ? Spacing.five : Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  safeArea: {
    gap: Spacing.four,
    maxWidth: MaxPhoneContentWidth,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: BottomTabInset + Spacing.five,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    flex: 1,
  },
});
