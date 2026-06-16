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
import type { Category, CategoryType } from '@/lib/database';

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function categoryTypeLabel(type: CategoryType | null) {
  if (type === 'income') {
    return 'Ingreso';
  }
  if (type === 'expense') {
    return 'Egreso';
  }
  return 'Ambas';
}

export default function CategoriesIndexScreen() {
  const { categories, removeCategory } = useCashioData();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const visibleCategories = useMemo(
    () => categories.filter((category) => matchesSearch(category.description, search)),
    [categories, search]
  );

  async function handleDelete(category: Category) {
    setMessage('');
    try {
      await removeCategory(category.id);
      setMessage('Categoría eliminada.');
    } catch (error) {
      if (error instanceof CashioValidationError) {
        setMessage(error.message);
        return;
      }
      setMessage('No se pudo eliminar la categoría.');
    }
  }

  return (
    <AdminIndexShell
      ctaHref="/categories/new"
      ctaLabel="Agregar categoría"
      emptyText="No hay categorías."
      hasRows={!!message || visibleCategories.length > 0}
      search={search}
      setSearch={setSearch}
      title="Categorías">
      {!!message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      {visibleCategories.map((category) => (
        <CategoryRow key={category.id} category={category} onDelete={() => handleDelete(category)} />
      ))}
    </AdminIndexShell>
  );
}

function CategoryRow({ category, onDelete }: { category: Category; onDelete: () => void }) {
  const theme = useTheme();
  const canDelete = category.transaction_count === 0;

  return (
    <ThemedView style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {category.description}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.typeText}>
        {categoryTypeLabel(category.type)}
      </ThemedText>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityLabel={`Editar ${category.description}`}
          onPress={() =>
            router.push({
              pathname: '/categories/[id]/edit',
              params: { id: String(category.id) },
            })
          }
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
          <AppIcon color={theme.text} name="edit-2" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Eliminar ${category.description}`}
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
  message: {
    paddingBottom: Spacing.one,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 44,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  typeText: {
    minWidth: 72,
    textAlign: 'left',
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  iconAction: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
