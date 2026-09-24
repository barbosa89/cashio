import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { AppIcon } from '@/components/app-icon';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
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
    <ModalSheet
      closeLabel={t('accessibility.closeAccountSelector')}
      isVisible={isVisible}
      onClose={onClose}
      title={t('transaction.account')}
    >
      <ScrollView contentContainerStyle={styles.listContent} style={styles.list}>
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
    </ModalSheet>
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
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <ThemedView
        type={selected ? 'primaryContainer' : 'surfaceMuted'}
        style={styles.option}
      >
        <View style={styles.optionText}>
          <ThemedText type="smallBold">{label}</ThemedText>
          {!!note && (
            <ThemedText type="small" themeColor="textSecondary">
              {note}
            </ThemedText>
          )}
        </View>
        {selected && <AppIcon color={theme.primary} name="check" size={18} />}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 420,
  },
  listContent: {
    gap: Spacing.two,
  },
  option: {
    alignItems: 'center',
    borderRadius: Radius.control,
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
