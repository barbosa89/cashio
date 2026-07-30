import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Account, AccountScope } from '@/lib/database';

type AccountSelectorProps = {
  accounts: Account[];
  isVisible: boolean;
  onClose: () => void;
  onSelect: (accountScope: AccountScope) => void;
  selectedAccountScope: AccountScope;
};

export function getAccountScopeLabel(
  accounts: Account[],
  accountScope: AccountScope,
  allLabel: string,
  fallbackLabel: string,
) {
  if (accountScope === 'all') {
    return allLabel;
  }

  return accounts.find((account) => account.id === accountScope)?.name ?? fallbackLabel;
}

export function AccountSelector({
  accounts,
  isVisible,
  onClose,
  onSelect,
  selectedAccountScope,
}: AccountSelectorProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  function selectAccount(accountScope: AccountScope) {
    onSelect(accountScope);
    onClose();
  }

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <ThemedView type="background" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{t('transaction.account')}</ThemedText>
              <Pressable
                accessibilityLabel={t('accessibility.closeAccountSelector')}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <AppIcon color={theme.text} name="x" size={22} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
              <AccountOption
                label={t('common.allFeminine')}
                onPress={() => selectAccount('all')}
                selected={selectedAccountScope === 'all'}
              />
              {accounts.map((account) => (
                <AccountOption
                  key={account.id}
                  label={account.name}
                  note={account.is_default === 1 ? t('admin.defaultAccount') : undefined}
                  onPress={() => selectAccount(account.id)}
                  selected={selectedAccountScope === account.id}
                />
              ))}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AccountOption({
  label,
  note,
  onPress,
  selected,
}: {
  label: string;
  note?: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.option}>
        <View style={styles.optionText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          {!!note && (
            <ThemedText type="small" themeColor="textSecondary">
              {note}
            </ThemedText>
          )}
        </View>
        {selected && <AppIcon color={theme.text} name="check" size={18} />}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  closeButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  listContent: {
    gap: Spacing.two,
  },
  modalCard: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: 460,
    padding: Spacing.three,
    width: 340,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  optionText: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
