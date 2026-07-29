import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { AccountEditor } from '@/components/account-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';

export default function EditAccountScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = Number(params.id);
  const { accounts, isLoading } = useCashioData();
  const account = accounts.find((item) => item.id === accountId);

  if (!account && !isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">{t('admin.accountNotFound')}</ThemedText>
        <Pressable onPress={() => router.replace('/accounts')} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.backLink}>
            <ThemedText type="smallBold">{t('accessibility.backToAccounts')}</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    );
  }

  return <AccountEditor account={account} />;
}

const styles = StyleSheet.create({
  backLink: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
