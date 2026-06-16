import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import { CashioValidationError } from '@/lib/cashio-repository';
import type { Category, CategoryType } from '@/lib/database';

const CATEGORY_TYPE_OPTIONS: Array<{ label: string; value: CategoryType }> = [
  { label: 'Ingreso', value: 'income' },
  { label: 'Egreso', value: 'expense' },
  { label: 'Ambas', value: 'both' },
];

export function CategoryEditor({ category }: { category?: Category }) {
  const theme = useTheme();
  const { addCategory, editCategory, isLoading } = useCashioData();
  const [description, setDescription] = useState(category?.description ?? '');
  const [categoryType, setCategoryType] = useState<CategoryType>(category?.type ?? 'both');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDescription(category?.description ?? '');
    setCategoryType(category?.type ?? 'both');
  }, [category]);

  async function handleSave() {
    setMessage('');
    try {
      if (category) {
        await editCategory(category.id, { description, type: categoryType });
      } else {
        await addCategory({ description, type: categoryType });
      }
      router.replace('/categories');
    } catch (error) {
      if (error instanceof CashioValidationError) {
        setMessage(error.message);
        return;
      }
      setMessage('No se pudo guardar la categoría.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={() => router.replace('/categories')} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.backButton}>
                <ThemedText type="smallBold">Volver</ThemedText>
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {category ? 'Editar categoría' : 'Nueva categoría'}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <View style={styles.field}>
              <ThemedText type="smallBold">Nombre</ThemedText>
              <TextInput
                onChangeText={setDescription}
                placeholder="Nombre"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                value={description}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Tipo</ThemedText>
              <View style={styles.typeGrid}>
                {CATEGORY_TYPE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setCategoryType(option.value)}
                    style={({ pressed }) => [styles.typeOption, pressed && styles.pressed]}>
                    <ThemedView
                      type={categoryType === option.value ? 'backgroundSelected' : 'background'}
                      style={styles.typeOptionInner}>
                      <ThemedText
                        type="smallBold"
                        themeColor={categoryType === option.value ? 'text' : 'textSecondary'}>
                        {option.label}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            </View>

            {!!message && (
              <ThemedText type="small" themeColor="textSecondary">
                {message}
              </ThemedText>
            )}

            <Pressable
              disabled={isLoading}
              onPress={handleSave}
              style={({ pressed }) => [pressed && styles.pressed, isLoading && styles.disabled]}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="smallBold">{category ? 'Guardar cambios' : 'Crear categoría'}</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
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
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    width: '100%',
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
  panel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeOption: {
    flexGrow: 1,
    minWidth: 96,
  },
  typeOptionInner: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
