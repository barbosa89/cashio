import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, Spacing } from '@/constants/theme';

type BudgetActionsProps = {
  onCopyPreviousBudget: () => void;
};

export function BudgetActions({ onCopyPreviousBudget }: BudgetActionsProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel="Copiar presupuesto del mes anterior"
        accessibilityRole="button"
        onPress={onCopyPreviousBudget}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView type="backgroundSelected" style={styles.actionButton}>
          <AppIcon color={AppPalette.brandOrange} name="copy" size={18} />
          <ThemedText type="smallBold">Copiar mes anterior</ThemedText>
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
