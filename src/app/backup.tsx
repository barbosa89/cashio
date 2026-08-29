import { useNavigation } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/localization-provider";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { translateError, translateErrorDescriptor } from "@/i18n/errors";
import { formatDateTime } from "@/i18n/formatters";
import { useLocalization } from "@/i18n/localization-provider";
import { syncBackupTaskRegistration } from "@/lib/backup/backup-scheduler";
import {
    connectBackup,
    disconnectBackup,
    getBackupState,
    restoreLatestBackup,
    runBackupNow,
    setDailyBackupEnabled,
} from "@/lib/backup/backup-service";
import { getDefaultBackupProviderId } from "@/lib/backup/providers";
import type { BackupMetadata } from "@/lib/backup/types";

function formatDate(value: string | null, locale: string, neverLabel: string) {
  if (!value) {
    return neverLabel;
  }

  return formatDateTime(value, locale);
}

function getProviderLabel(provider: BackupMetadata["provider"]) {
  if (provider === "google-drive") {
    return "Google Drive";
  }

  if (provider === "icloud") {
    return "iCloud";
  }

  const defaultProvider = getDefaultBackupProviderId();
  return defaultProvider === "icloud" ? "iCloud" : "Google Drive";
}

export default function BackupScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const [metadata, setMetadata] = useState<BackupMetadata | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadState = useCallback(async () => {
    setMetadata(await getBackupState());
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function runAction(
    action: () => Promise<BackupMetadata>,
    successMessage: string,
  ) {
    setIsBusy(true);
    setMessage(null);

    try {
      const nextMetadata = await action();
      await syncBackupTaskRegistration();
      setMetadata(nextMetadata);
      setMessage(successMessage);
    } catch (error) {
      setMessage(translateError(error, t));
      await loadState();
    } finally {
      setIsBusy(false);
    }
  }

  function confirmRestore() {
    if (Platform.OS === "web") {
      if (confirm(t("backup.confirmMessage"))) {
        void runAction(restoreLatestBackup, t("backup.restored"));
      }
      return;
    }

    Alert.alert(
      t("backup.confirmTitle"),
      t("backup.confirmMessage"),
      [
        { style: "cancel", text: t("common.cancel") },
        {
          onPress: () =>
            void runAction(
              restoreLatestBackup,
              t("backup.restored"),
            ),
          style: "destructive",
          text: t("restoreGate.restore"),
        },
      ],
    );
  }

  const providerLabel = getProviderLabel(metadata?.provider ?? null);
  const isConnected = Boolean(metadata?.provider);
  const isEnabled = Boolean(metadata?.enabled);

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
                accessibilityLabel={t("accessibility.openMenu")}
                accessibilityRole="button"
                onPress={() => navigation.openDrawer()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView
                  style={styles.menuButton}
                >
                  <AppIcon color={theme.text} name="menu" size={28} />
                </ThemedView>
              </Pressable>
              <ThemedView type="backgroundSelected" style={styles.titleIcon}>
                <AppIcon color={theme.text} name="cloud" size={28} />
              </ThemedView>
              <View style={styles.titleCopy}>
                <ThemedText type="subtitle" style={styles.title}>
                  {t("backup.title")}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {providerLabel}
                </ThemedText>
              </View>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.statusPanel}>
              <StatusRow
                label={t("backup.status")}
                value={isConnected ? t("backup.connected") : t("backup.disconnected")}
              />
              <StatusRow
                label={t("backup.dailyBackup")}
                value={isEnabled ? t("backup.active") : t("backup.inactive")}
              />
              <StatusRow
                label={t("backup.lastBackup")}
                value={formatDate(metadata?.lastBackupAt ?? null, languageTag, t("backup.never"))}
              />
              <StatusRow
                label={t("backup.lastRestore")}
                value={formatDate(metadata?.lastRestoreAt ?? null, languageTag, t("backup.never"))}
              />
            </ThemedView>

            {(message || metadata?.lastError) && (
              <ThemedView type="backgroundSelected" style={styles.message}>
                <ThemedText type="smallBold">
                  {message ??
                    (metadata?.lastError
                      ? translateErrorDescriptor(metadata.lastError, t)
                      : null)}
                </ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.actions}>
              <ActionButton
                disabled={isBusy}
                icon={isConnected ? "log-out" : "log-in"}
                label={
                  isConnected
                    ? t("backup.disconnect")
                    : `${t("backup.connect")} ${providerLabel}`
                }
                onPress={() =>
                  void runAction(
                    isConnected ? disconnectBackup : () => connectBackup(),
                    isConnected
                      ? t("backup.disconnectedMessage")
                      : t("backup.connectedMessage"),
                  )
                }
                variant={isConnected ? "secondary" : "primary"}
              />
              <ActionButton
                disabled={isBusy || !isConnected}
                icon="upload-cloud"
                label={t("backup.runNow")}
                onPress={() =>
                  void runAction(
                    () => runBackupNow(db),
                    t("backup.created"),
                  )
                }
                variant="secondary"
              />
              <ActionButton
                disabled={isBusy || !isConnected}
                icon="download-cloud"
                label={t("backup.restore")}
                onPress={confirmRestore}
                variant="secondary"
              />
              <ActionButton
                disabled={isBusy || !isConnected}
                icon={isEnabled ? "pause-circle" : "play-circle"}
                label={
                  isEnabled ? t("backup.disable") : t("backup.enable")
                }
                onPress={() =>
                  void runAction(
                    () => setDailyBackupEnabled(!isEnabled),
                    isEnabled
                      ? t("backup.disabled")
                      : t("backup.enabled"),
                  )
                }
                variant="secondary"
              />
            </ThemedView>

            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.note}
            >
              {Platform.OS === "ios"
                ? t("backup.iosSchedule")
                : t("backup.androidDriveNote")}
            </ThemedText>
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.statusValue}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  variant,
}: {
  disabled: boolean;
  icon: ComponentProps<typeof AppIcon>["name"];
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  const theme = useTheme();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: isPrimary
            ? AppPalette.brandOrange
            : theme.backgroundSelected,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppIcon
        color={isPrimary ? AppPalette.foregroundOnBrand : theme.text}
        name={icon}
        size={20}
      />
      <ThemedText
        type="smallBold"
        style={isPrimary && styles.primaryButtonText}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  menuButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
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
  message: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  note: {
    textAlign: "center",
  },
  phoneSurface: {
    borderWidth: Platform.OS === "web" ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    width: "100%",
  },
  primaryButtonText: {
    color: AppPalette.foregroundOnBrand,
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
  statusPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  statusValue: {
    flex: 1,
    textAlign: "right",
  },
  title: {
    fontSize: 24,
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
