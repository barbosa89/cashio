import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { AdminIndexShell } from '@/components/admin-index-shell';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import { translateError } from '@/i18n/errors';
import { formatNumber } from '@/i18n/formatters';
import { useLocalization } from '@/i18n/localization-provider';
import type { Account } from '@/lib/database';

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

export default function AccountsIndexScreen() {
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const { accounts, removeAccount } = useCashioData();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => matchesSearch(account.name, search)),
    [accounts, search]
  );

  async function handleDelete(account: Account) {
    setMessage('');
    try {
      await removeAccount(account.id);
      setMessage(t('admin.accountDeleted'));
    } catch (error) {
      setMessage(translateError(error, t));
    }
  }

  return (
    <AdminIndexShell
      ctaHref="/accounts/new"
      ctaLabel={t('admin.addAccount')}
      emptyText={t('admin.noAccounts')}
      hasRows={!!message || visibleAccounts.length > 0}
      search={search}
      setSearch={setSearch}
      title={t('navigation.accounts')}>
      {!!message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      {visibleAccounts.map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          languageTag={languageTag}
          onDelete={() => handleDelete(account)}
        />
      ))}
    </AdminIndexShell>
  );
}

function AccountRow({
  account,
  languageTag,
  onDelete,
}: {
  account: Account;
  languageTag: string;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const canDelete = account.has_transactions === 0 && account.is_default === 0;

  return (
    <ThemedView style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" style={styles.rowTitle}>
            {account.name}
          </ThemedText>
          {account.is_default === 1 && (
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.defaultAccount')}
            </ThemedText>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.initialBalance', {
            amount: formatNumber(account.initial_balance, languageTag),
          })}
        </ThemedText>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityLabel={t('accessibility.editNamed', { name: account.name })}
          onPress={() =>
            router.push({
              pathname: '/accounts/[id]/edit',
              params: { id: String(account.id) },
            })
          }
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
          <AppIcon color={theme.text} name="edit-2" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('accessibility.deleteNamed', { name: account.name })}
          disabled={!canDelete}
          onPress={onDelete}
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed, !canDelete && styles.disabled]}>
          <AppIcon color={canDelete ? theme.text : theme.textSecondary} name="trash-2" size={18} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
  iconAction: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  message: {
    paddingBottom: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 54,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
