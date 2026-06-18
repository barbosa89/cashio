import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { CashioLogo } from '@/components/cashio-logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  connectBackup,
  disconnectBackup,
  getBackupState,
  restoreLatestBackup,
  runBackupNow,
  setDailyBackupEnabled,
} from '@/lib/backup/backup-service';
import { syncBackupTaskRegistration } from '@/lib/backup/backup-scheduler';
import { getDefaultBackupProviderId } from '@/lib/backup/providers';
import type { BackupMetadata } from '@/lib/backup/types';

function formatDate(value: string | null) {
  if (!value) {
    return 'Nunca';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getProviderLabel(provider: BackupMetadata['provider']) {
  if (provider === 'google-drive') {
    return 'Google Drive';
  }

  if (provider === 'icloud') {
    return 'iCloud';
  }

  const defaultProvider = getDefaultBackupProviderId();
  return defaultProvider === 'icloud' ? 'iCloud' : 'Google Drive';
}

export default function BackupScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [metadata, setMetadata] = useState<BackupMetadata | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadState = useCallback(async () => {
    setMetadata(await getBackupState());
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function runAction(action: () => Promise<BackupMetadata>, successMessage: string) {
    setIsBusy(true);
    setMessage(null);

    try {
      const nextMetadata = await action();
      await syncBackupTaskRegistration();
      setMetadata(nextMetadata);
      setMessage(successMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'No se pudo completar la operación.';
      setMessage(errorMessage);
      await loadState();
    } finally {
      setIsBusy(false);
    }
  }

  function confirmRestore() {
    Alert.alert(
      'Restaurar copia',
      'Se reemplazará la base de datos local por la copia encontrada en la nube.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: () =>
            void runAction(restoreLatestBackup, 'Copia restaurada. Reinicia la app si no ves los cambios.'),
          style: 'destructive',
          text: 'Restaurar',
        },
      ]
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
            <CashioLogo />

            <ThemedView style={styles.titleRow}>
              <ThemedView type="backgroundSelected" style={styles.titleIcon}>
                <AppIcon color={theme.text} name="cloud" size={28} />
              </ThemedView>
              <View style={styles.titleCopy}>
                <ThemedText type="subtitle" style={styles.title}>
                  Copia de seguridad
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {providerLabel}
                </ThemedText>
              </View>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.statusPanel}>
              <StatusRow label="Estado" value={isConnected ? 'Conectada' : 'Desactivada'} />
              <StatusRow label="Copia diaria" value={isEnabled ? 'Activa' : 'Inactiva'} />
              <StatusRow label="Última copia" value={formatDate(metadata?.lastBackupAt ?? null)} />
              <StatusRow label="Última restauración" value={formatDate(metadata?.lastRestoreAt ?? null)} />
            </ThemedView>

            {(message || metadata?.lastError) && (
              <ThemedView type="backgroundSelected" style={styles.message}>
                <ThemedText type="smallBold">{message ?? metadata?.lastError}</ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.actions}>
              <ActionButton
                disabled={isBusy}
                icon={isConnected ? 'log-out' : 'log-in'}
                label={isConnected ? 'Desconectar' : `Conectar ${providerLabel}`}
                onPress={() =>
                  void runAction(
                    isConnected ? disconnectBackup : () => connectBackup(),
                    isConnected ? 'Copia de seguridad desconectada.' : 'Cuenta conectada.'
                  )
                }
                variant={isConnected ? 'secondary' : 'primary'}
              />
              <ActionButton
                disabled={isBusy || !isConnected}
                icon="upload-cloud"
                label="Ejecutar copia ahora"
                onPress={() => void runAction(() => runBackupNow(db), 'Copia de seguridad creada.')}
                variant="secondary"
              />
              <ActionButton
                disabled={isBusy || !isConnected}
                icon="download-cloud"
                label="Restaurar desde copia"
                onPress={confirmRestore}
                variant="secondary"
              />
              <ActionButton
                disabled={isBusy || !isConnected}
                icon={isEnabled ? 'pause-circle' : 'play-circle'}
                label={isEnabled ? 'Desactivar copia diaria' : 'Activar copia diaria'}
                onPress={() =>
                  void runAction(
                    () => setDailyBackupEnabled(!isEnabled),
                    isEnabled ? 'Copia diaria desactivada.' : 'Copia diaria activada.'
                  )
                }
                variant="secondary"
              />
            </ThemedView>

            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {Platform.OS === 'ios'
                ? 'iOS decide cuándo ejecutar tareas en segundo plano. Cash IO también intentará respaldar al abrir la app si pasó más de un día.'
                : 'Android usa Google Drive appDataFolder. El archivo no aparece como documento normal en Drive.'}
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
      <ThemedText type="small" themeColor="textSecondary" style={styles.statusValue}>
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
  icon: ComponentProps<typeof AppIcon>['name'];
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: isPrimary ? AppPalette.brandOrange : theme.backgroundSelected,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppIcon
        color={isPrimary ? AppPalette.foregroundInverse : theme.text}
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
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
    textAlign: 'center',
  },
  phoneSurface: {
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    width: '100%',
  },
  primaryButtonText: {
    color: AppPalette.foregroundInverse,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.three : 0,
  },
  statusPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  statusValue: {
    flex: 1,
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  titleIcon: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
