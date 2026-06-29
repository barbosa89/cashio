import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminIndexShell } from '@/components/admin-index-shell';
import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import { CashioValidationError } from '@/lib/cashio-repository';
import type { Account } from '@/lib/database';

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

export default function AccountsIndexScreen() {
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
      setMessage('Cuenta eliminada.');
    } catch (error) {
      if (error instanceof CashioValidationError) {
        setMessage(error.message);
        return;
      }
      setMessage('No se pudo eliminar la cuenta.');
    }
  }

  return (
    <AdminIndexShell
      ctaHref="/accounts/new"
      ctaLabel="Agregar cuenta"
      emptyText="No hay cuentas."
      hasRows={!!message || visibleAccounts.length > 0}
      search={search}
      setSearch={setSearch}
      title="Cuentas">
      {!!message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      {visibleAccounts.map((account) => (
        <AccountRow key={account.id} account={account} onDelete={() => handleDelete(account)} />
      ))}
    </AdminIndexShell>
  );
}

function AccountRow({ account, onDelete }: { account: Account; onDelete: () => void }) {
  const theme = useTheme();
  const canDelete = account.transaction_count === 0 && account.is_default === 0;

  return (
    <ThemedView style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" style={styles.rowTitle}>
            {account.name}
          </ThemedText>
          {account.is_default === 1 && (
            <ThemedText type="small" themeColor="textSecondary">
              Principal
            </ThemedText>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Saldo inicial: $ {formatMoney(account.initial_balance)}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.countText}>
        {account.transaction_count} tx
      </ThemedText>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityLabel={`Editar ${account.name}`}
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
          accessibilityLabel={`Eliminar ${account.name}`}
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
  countText: {
    minWidth: 48,
    textAlign: 'left',
  },
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
