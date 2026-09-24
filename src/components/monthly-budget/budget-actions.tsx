import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@/i18n/localization-provider';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';

type BudgetActionsProps = {
  onCopyPreviousBudget: () => void;
};

export function BudgetActions({ onCopyPreviousBudget }: BudgetActionsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel={t('accessibility.copyPreviousBudget')}
        accessibilityRole="button"
        onPress={onCopyPreviousBudget}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView type="surfaceMuted" style={styles.actionButton}>
          <AppIcon color={AppPalette.brandOrange} name="copy" size={18} />
          <ThemedText type="smallBold">{t('budget.copyPrevious')}</ThemedText>
        </ThemedView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: Spacing.two,
    minWidth: 0,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.one,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
