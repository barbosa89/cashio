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
import CurrencyInput from "react-native-currency-input";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import { getNumberSeparators } from "@/i18n/formatters";
import { useLocalization } from "@/i18n/localization-provider";
import type { Account } from "@/lib/database";

export function AccountEditor({ account }: { account?: Account }) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const numberSeparators = getNumberSeparators(languageTag);
  const { addAccount, editAccount, isLoading } = useCashioData();
  const [name, setName] = useState(account?.name ?? "");
  const [initialBalance, setInitialBalance] = useState<number | null>(
    account?.initial_balance ?? 0,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(account?.name ?? "");
    setInitialBalance(account?.initial_balance ?? 0);
  }, [account]);

  function resetForm() {
    setName("");
    setInitialBalance(0);
    setMessage("");
  }

  async function handleSave() {
    setMessage("");
    try {
      if (account) {
        await editAccount(account.id, {
          initialBalance: initialBalance ?? 0,
          name,
        });
      } else {
        await addAccount({
          initialBalance: initialBalance ?? 0,
          name,
        });
      }
      resetForm();
      router.replace("/accounts");
    } catch (error) {
      setMessage(translateError(error, t));
    }
  }

  function handleBack() {
    resetForm();
    router.replace("/accounts");
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
              accessibilityLabel={t("accessibility.backToAccounts")}
              onPress={handleBack}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView style={[styles.backButton, { borderColor: theme.text }]}>
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {account ? t("accountEditor.editTitle") : t("accountEditor.newTitle")}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.field}>
              <ThemedText type="smallBold">{t("accountEditor.name")}</ThemedText>
              <TextInput
                onChangeText={setName}
                placeholder={t("accountEditor.name")}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  { borderColor: theme.backgroundSelected, color: theme.text },
                ]}
                value={name}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">{t("accountEditor.initialBalance")}</ThemedText>
              <CurrencyInput
                delimiter={numberSeparators.delimiter}
                keyboardType="numeric"
                onChangeValue={setInitialBalance}
                placeholder="$ 0"
                placeholderTextColor={theme.textSecondary}
                precision={0}
                prefix="$ "
                separator={numberSeparators.separator}
                style={[
                  styles.input,
                  { borderColor: theme.backgroundSelected, color: theme.text },
                ]}
                value={initialBalance}
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
                  {account ? t("accountEditor.save") : t("accountEditor.create")}
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
  backButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  container: {
    flex: 1,
  },
  disabled: {
    opacity: 0.45,
  },
  field: {
    gap: Spacing.two,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    paddingTop: Platform.OS === "web" ? Spacing.five : Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  panel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  safeArea: {
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  saveButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
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
    fontSize: 32,
    lineHeight: 38,
  },
});
