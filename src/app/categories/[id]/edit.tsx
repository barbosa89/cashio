import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryEditor } from '@/components/category-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';

export default function EditCategoryScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { categories, isLoading } = useCashioData();
  const categoryId = Number(params.id);
  const category = categories.find((item) => item.id === categoryId);

  if (!category && !isLoading) {
    return (
      <ThemedView style={styles.notFound}>
        <View style={styles.notFoundContent}>
          <ThemedText type="subtitle">Categoría no encontrada</ThemedText>
          <Pressable onPress={() => router.replace('/categories')} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.backButton}>
              <ThemedText type="smallBold">Volver a categorías</ThemedText>
            </ThemedView>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return <CategoryEditor category={category} />;
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  notFoundContent: {
    gap: Spacing.three,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
