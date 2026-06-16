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
import type { Tag } from '@/lib/database';

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

export default function TagsIndexScreen() {
  const { removeTag, tags } = useCashioData();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const visibleTags = useMemo(
    () => tags.filter((tag) => matchesSearch(tag.description, search)),
    [tags, search]
  );

  async function handleDelete(tag: Tag) {
    setMessage('');
    try {
      await removeTag(tag.id);
      setMessage('Tag eliminado.');
    } catch (error) {
      if (error instanceof CashioValidationError) {
        setMessage(error.message);
        return;
      }
      setMessage('No se pudo eliminar el tag.');
    }
  }

  return (
    <AdminIndexShell
      ctaHref="/tags/new"
      ctaLabel="Agregar tag"
      emptyText="No hay tags."
      hasRows={!!message || visibleTags.length > 0}
      search={search}
      setSearch={setSearch}
      title="Tags">
      {!!message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      {visibleTags.map((tag) => (
        <TagRow key={tag.id} tag={tag} onDelete={() => handleDelete(tag)} />
      ))}
    </AdminIndexShell>
  );
}

function TagRow({ tag, onDelete }: { tag: Tag; onDelete: () => void }) {
  const theme = useTheme();
  const canDelete = tag.transaction_count === 0;

  return (
    <ThemedView style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {tag.description}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.countText}>
        {tag.transaction_count} tx
      </ThemedText>
      <View style={styles.rowActions}>
        <Pressable
          accessibilityLabel={`Editar ${tag.description}`}
          onPress={() =>
            router.push({
              pathname: '/tags/[id]/edit',
              params: { id: String(tag.id) },
            })
          }
          style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
          <AppIcon color={theme.text} name="edit-2" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Eliminar ${tag.description}`}
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
  countText: {
    minWidth: 48,
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
