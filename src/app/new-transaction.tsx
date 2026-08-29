import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n/localization-provider';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionForm, type TransactionFormHandle } from '@/components/transaction-form';
import { BottomTabInset, MaxPhoneContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function NewTransactionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const formRef = useRef<TransactionFormHandle>(null);
  const params = useLocalSearchParams<{ accountId?: string }>();
  const parsedAccountId = Number(params.accountId);
  const initialAccountId =
    Number.isInteger(parsedAccountId) && parsedAccountId > 0
      ? parsedAccountId
      : null;

  function handleBack() {
    formRef.current?.reset();
    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <Pressable
              accessibilityLabel={t('accessibility.backToTransactions')}
              accessibilityRole="button"
              onPress={handleBack}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView style={[styles.backButton, { borderColor: theme.text }]}>
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {t('transaction.newRecord')}
            </ThemedText>
          </ThemedView>

          <TransactionForm
            ref={formRef}
            initialAccountId={initialAccountId}
            onSaved={() => router.replace('/')}
          />
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
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.five,
  },
  safeArea: {
    width: '100%',
    maxWidth: MaxPhoneContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Platform.OS === 'web' ? Spacing.five : Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    flex: 1,
    fontSize: 32,
    lineHeight: 38,
  },
  pressed: {
    opacity: 0.7,
  },
});
