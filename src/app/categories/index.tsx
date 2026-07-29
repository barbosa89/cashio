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
import type { Category, CategoryType } from '@/lib/database';

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function categoryTypeLabel(type: CategoryType | null, t: ReturnType<typeof useTranslation>['t']) {
  if (type === 'income') {
    return t('admin.categoryIncome');
  }
  if (type === 'expense') {
    return t('admin.categoryExpense');
  }
  return t('admin.categoryBoth');
}

export default function CategoriesIndexScreen() {
  const { t } = useTranslation();
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
      setMessage(t('admin.categoryDeleted'));
    } catch (error) {
      setMessage(translateError(error, t));
    }
  }

  return (
    <AdminIndexShell
      ctaHref="/categories/new"
      ctaLabel={t('admin.addCategory')}
      emptyText={t('admin.noCategories')}
      hasRows={!!message || visibleCategories.length > 0}
      search={search}
      setSearch={setSearch}
      title={t('navigation.categories')}>
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
  const { t } = useTranslation();
  const canDelete = category.transaction_count === 0;

  return (
    <ThemedView style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {category.description}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.typeText}>
        {categoryTypeLabel(category.type, t)}
      </ThemedText>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityLabel={t('accessibility.editNamed', { name: category.description })}
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
          accessibilityLabel={t('accessibility.deleteNamed', { name: category.description })}
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
