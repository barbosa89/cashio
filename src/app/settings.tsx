import { router } from "expo-router";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, Spacing } from "@/constants/theme";
import { useCashioSettings } from "@/hooks/use-cashio-settings";
import { useTheme } from "@/hooks/use-theme";

type SettingToggleCardProps = {
  description: string;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
  title: string;
  value: boolean;
};

function SettingToggleCard({
  description,
  disabled,
  onValueChange,
  title,
  value,
}: SettingToggleCardProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.settingsPanel}>
      <View style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <ThemedText type="smallBold" style={styles.settingTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.settingDescription}
          >
            {description}
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel={title}
          disabled={disabled}
          ios_backgroundColor={theme.backgroundSelected}
          onValueChange={onValueChange}
          thumbColor={AppPalette.foregroundInverse}
          trackColor={{
            false: theme.backgroundSelected,
            true: AppPalette.brandOrange,
          }}
          value={value}
        />
      </View>
    </ThemedView>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const {
    errorMessage,
    isLoading,
    settings,
    setAccumulatePreviousBalances,
    setAutoCopyPreviousMonthBudget,
  } = useCashioSettings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          style={[
            styles.phoneSurface,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedView style={styles.titleRow}>
              <Pressable
                accessibilityLabel="Volver al índice de transacciones"
                onPress={() => router.replace("/")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView
                  style={[styles.backButton, { borderColor: theme.text }]}
                >
                  <AppIcon color={theme.text} name="arrow-left" size={22} />
                </ThemedView>
              </Pressable>
              <ThemedView type="backgroundSelected" style={styles.titleIcon}>
                <AppIcon color={theme.text} name="settings" size={28} />
              </ThemedView>
              <View style={styles.titleCopy}>
                <ThemedText type="subtitle" style={styles.title}>
                  Configuraciones
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Preferencias de Cash IO
                </ThemedText>
              </View>
            </ThemedView>

            <SettingToggleCard
              description="Incluye el saldo histórico de meses anteriores en el mes visible."
              disabled={isLoading}
              onValueChange={(value) => void setAccumulatePreviousBalances(value)}
              title="Acumular saldos"
              value={settings.accumulatePreviousBalances}
            />

            <SettingToggleCard
              description="Copia automáticamente las categorías presupuestadas del mes anterior al abrir un mes."
              disabled={isLoading}
              onValueChange={(value) =>
                void setAutoCopyPreviousMonthBudget(value)
              }
              title="Copiar presupuesto"
              value={settings.autoCopyPreviousMonthBudget}
            />

            {!!errorMessage && (
              <ThemedView type="backgroundSelected" style={styles.message}>
                <ThemedText type="smallBold">{errorMessage}</ThemedText>
              </ThemedView>
            )}
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  message: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  phoneSurface: {
    borderWidth: Platform.OS === "web" ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    width: "100%",
  },
  pressed: {
    opacity: 0.6,
  },
  safeArea: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === "web" ? Spacing.three : 0,
  },
  settingCopy: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  settingDescription: {
    lineHeight: 18,
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  settingsPanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  settingTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 34,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  titleIcon: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
});
