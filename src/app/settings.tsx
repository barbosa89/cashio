import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';
import { useCashioSettings } from '@/hooks/use-cashio-settings';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const {
    errorMessage,
    isLoading,
    settings,
    setAccumulatePreviousBalances,
  } = useCashioSettings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={[styles.phoneSurface, { borderColor: theme.backgroundSelected }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedView style={styles.titleRow}>
              <Pressable
                accessibilityLabel="Volver al índice de transacciones"
                onPress={() => router.replace('/')}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView style={[styles.backButton, { borderColor: theme.text }]}>
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

            <ThemedView type="backgroundElement" style={styles.settingsPanel}>
              <View style={styles.settingRow}>
                <View style={styles.settingCopy}>
                  <ThemedText type="smallBold" style={styles.settingTitle}>
                    Acumular saldos
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.settingDescription}>
                    Incluye el saldo histórico de meses anteriores en el mes visible.
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="Acumular saldos"
                  disabled={isLoading}
                  ios_backgroundColor={theme.backgroundSelected}
                  onValueChange={(value) => void setAccumulatePreviousBalances(value)}
                  thumbColor={AppPalette.foregroundInverse}
                  trackColor={{
                    false: theme.backgroundSelected,
                    true: AppPalette.brandOrange,
                  }}
                  value={settings.accumulatePreviousBalances}
                />
              </View>
            </ThemedView>

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
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
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
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    width: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.three : 0,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
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
    fontSize: 24,
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
