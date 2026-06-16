import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionForm } from '@/components/transaction-form';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function NewTransactionScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.backButton}>
                <ThemedText type="smallBold">Volver</ThemedText>
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              Nuevo registro
            </ThemedText>
          </ThemedView>

          <TransactionForm onSaved={() => router.replace('/')} />
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
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.five : Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
  },
  pressed: {
    opacity: 0.7,
  },
});
