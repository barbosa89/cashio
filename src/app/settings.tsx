import { useNavigation } from "expo-router";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useLocalization,
  useTranslation,
} from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { SettingSwitch } from "@/components/setting-switch";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useCashioSettings } from "@/hooks/use-cashio-settings";
import { useTheme } from "@/hooks/use-theme";
import type {
  LanguagePreference,
  SupportedLanguage,
} from "@/i18n/types";

const LANGUAGE_OPTIONS = [
  { code: "EN", label: "English", value: "en" },
  { code: "ES", label: "Español", value: "es" },
  { code: "PT", label: "Português (Brasil)", value: "pt" },
] as const satisfies readonly {
  code: string;
  label: string;
  value: SupportedLanguage;
}[];

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
  return (
    <ThemedView type="surfaceMuted" style={styles.settingsPanel}>
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
        <SettingSwitch
          accessibilityLabel={title}
          disabled={disabled}
          onValueChange={onValueChange}
          value={value}
        />
      </View>
    </ThemedView>
  );
}

type LanguageSettingCardProps = {
  deviceLanguage: SupportedLanguage;
  disabled: boolean;
  effectiveLanguage: SupportedLanguage;
  onSelect: (preference: LanguagePreference) => void;
  preference: LanguagePreference;
};

function LanguageSettingCard({
  deviceLanguage,
  disabled,
  effectiveLanguage,
  onSelect,
  preference,
}: Readonly<LanguageSettingCardProps>) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <ThemedView type="surfaceMuted" style={styles.languagePanel}>
      <View style={styles.languageIntro}>
        <ThemedText type="smallBold" style={styles.settingTitle}>
          {t("settings.language")}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.settingDescription}
        >
          {t("settings.languageDescription")}
        </ThemedText>
      </View>

      <View style={styles.languageOptions}>
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = option.value === effectiveLanguage;
          const followsDevice =
            preference === null && option.value === deviceLanguage;

          return (
            <Pressable
              accessibilityLabel={t("accessibility.selectLanguage", {
                language: option.label,
              })}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <ThemedView
                type={isSelected ? "primaryContainer" : "surfaceRaised"}
                style={styles.languageOption}
              >
                <ThemedView type="surface" style={styles.languageCode}>
                  <ThemedText type="smallBold">{option.code}</ThemedText>
                </ThemedView>
                <View style={styles.languageOptionCopy}>
                  <ThemedText
                    type="smallBold"
                    numberOfLines={2}
                    style={styles.languageOptionLabel}
                  >
                    {option.label}
                  </ThemedText>
                  {followsDevice && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t("settings.deviceLanguage")}
                    </ThemedText>
                  )}
                </View>
                {isSelected && (
                  <AppIcon
                    color={AppPalette.brandOrange}
                    name="check"
                    size={20}
                  />
                )}
              </ThemedView>
            </Pressable>
          );
        })}
      </View>

      {preference !== null && (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect(null)}
          style={({ pressed }) => [
            styles.deviceLanguageButton,
            { borderColor: theme.border },
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <AppIcon color={theme.textSecondary} name="smartphone" size={18} />
          <ThemedText type="smallBold">
            {t("settings.useDeviceLanguage")}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const theme = useTheme();
  const { t } = useTranslation();
  const { deviceLanguage, language } = useLocalization();
  const {
    errorMessage,
    isLoading,
    isSavingLanguage,
    settings,
    setAccumulatePreviousBalances,
    setAutoCopyPreviousMonthBudget,
    setLanguagePreference,
  } = useCashioSettings();

  return (
    <ThemedView type="canvas" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          type="surface"
          style={[
            styles.phoneSurface,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.titleRow}>
              <Pressable
                accessibilityLabel={t("accessibility.openMenu")}
                accessibilityRole="button"
                onPress={() => navigation.openDrawer()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView type="surfaceMuted" style={styles.menuButton}>
                  <AppIcon color={theme.text} name="menu" size={28} />
                </ThemedView>
              </Pressable>
              <ThemedView type="primaryContainer" style={styles.titleIcon}>
                <AppIcon color={theme.text} name="settings" size={28} />
              </ThemedView>
              <View style={styles.titleCopy}>
                <ThemedText type="subtitle" style={styles.title}>
                  {t("settings.title")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("settings.subtitle")}
                </ThemedText>
              </View>
            </View>

            <LanguageSettingCard
              deviceLanguage={deviceLanguage}
              disabled={isLoading || isSavingLanguage}
              effectiveLanguage={language}
              onSelect={(preference) =>
                void setLanguagePreference(preference)
              }
              preference={settings.languagePreference}
            />

            <SettingToggleCard
              description={t("settings.accumulateBalancesDescription")}
              disabled={isLoading}
              onValueChange={(value) => void setAccumulatePreviousBalances(value)}
              title={t("settings.accumulateBalances")}
              value={settings.accumulatePreviousBalances}
            />

            <SettingToggleCard
              description={t("settings.copyBudgetDescription")}
              disabled={isLoading}
              onValueChange={(value) =>
                void setAutoCopyPreviousMonthBudget(value)
              }
              title={t("settings.copyBudget")}
              value={settings.autoCopyPreviousMonthBudget}
            />

            {!!errorMessage && (
              <ThemedView
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                type="surfaceMuted"
                style={styles.message}
              >
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
  menuButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  deviceLanguageButton: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: Radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  disabled: {
    opacity: 0.55,
  },
  languageCode: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  languageIntro: {
    gap: Spacing.one,
  },
  languageOption: {
    alignItems: "center",
    borderRadius: Radius.control,
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  languageOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  languageOptionLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  languageOptions: {
    gap: Spacing.one,
  },
  languagePanel: {
    borderRadius: Radius.card,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  message: {
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  phoneSurface: {
    borderWidth: Platform.OS === "web" ? 1 : 0,
    flex: 1,
    maxWidth: MaxContentWidth,
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
    borderRadius: Radius.card,
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
    borderRadius: Radius.card,
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
