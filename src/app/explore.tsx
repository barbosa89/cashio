import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import { CashioValidationError } from '@/lib/cashio-repository';
import type { Category, CategoryType, Tag } from '@/lib/database';

type AdminSection = 'categories' | 'tags';

const CATEGORY_TYPE_OPTIONS: Array<{ label: string; value: CategoryType | null }> = [
  { label: 'Sin tipo', value: null },
  { label: 'Ingreso', value: 'income' },
  { label: 'Egreso', value: 'expense' },
  { label: 'Ambos', value: 'both' },
];

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function categoryTypeLabel(type: CategoryType | null) {
  if (type === 'income') {
    return 'Ingreso';
  }
  if (type === 'expense') {
    return 'Egreso';
  }
  if (type === 'both') {
    return 'Ambos';
  }
  return 'Sin tipo';
}

export default function AdminScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ section?: AdminSection }>();
  const {
    categories,
    tags,
    isLoading,
    addCategory,
    editCategory,
    removeCategory,
    addTag,
    editTag,
    removeTag,
  } = useCashioData();
  const [activeSection, setActiveSection] = useState<AdminSection>('categories');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDescription, setTagDescription] = useState('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (params.section === 'categories' || params.section === 'tags') {
      setActiveSection(params.section);
    }
  }, [params.section]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => matchesSearch(category.description, categorySearch)),
    [categories, categorySearch]
  );

  const visibleTags = useMemo(
    () => tags.filter((tag) => matchesSearch(tag.description, tagSearch)),
    [tags, tagSearch]
  );

  function handleError(error: unknown) {
    if (error instanceof CashioValidationError) {
      setMessage(error.message);
      return;
    }
    setMessage('No se pudo completar la acción.');
  }

  function resetCategoryForm() {
    setCategoryDescription('');
    setCategoryType(null);
    setEditingCategoryId(null);
  }

  function resetTagForm() {
    setTagDescription('');
    setEditingTagId(null);
  }

  async function handleSaveCategory() {
    setMessage('');
    try {
      if (editingCategoryId) {
        await editCategory(editingCategoryId, {
          description: categoryDescription,
          type: categoryType,
        });
        setMessage('Categoría actualizada.');
      } else {
        await addCategory({ description: categoryDescription, type: categoryType });
        setMessage('Categoría creada.');
      }
      resetCategoryForm();
    } catch (error) {
      handleError(error);
    }
  }

  async function handleDeleteCategory(category: Category) {
    setMessage('');
    try {
      await removeCategory(category.id);
      if (editingCategoryId === category.id) {
        resetCategoryForm();
      }
      setMessage('Categoría eliminada.');
    } catch (error) {
      handleError(error);
    }
  }

  async function handleSaveTag() {
    setMessage('');
    try {
      if (editingTagId) {
        await editTag(editingTagId, { description: tagDescription });
        setMessage('Tag actualizado.');
      } else {
        await addTag({ description: tagDescription });
        setMessage('Tag creado.');
      }
      resetTagForm();
    } catch (error) {
      handleError(error);
    }
  }

  async function handleDeleteTag(tag: Tag) {
    setMessage('');
    try {
      await removeTag(tag.id);
      if (editingTagId === tag.id) {
        resetTagForm();
      }
      setMessage('Tag eliminado.');
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Administrar
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundSelected" style={styles.segmentedControl}>
            <SegmentButton
              active={activeSection === 'categories'}
              label="Categorías"
              onPress={() => setActiveSection('categories')}
            />
            <SegmentButton active={activeSection === 'tags'} label="Tags" onPress={() => setActiveSection('tags')} />
          </ThemedView>

          {!!message && (
            <ThemedText type="small" themeColor="textSecondary">
              {message}
            </ThemedText>
          )}

          {activeSection === 'categories' ? (
            <ThemedView style={styles.section}>
              <ThemedView type="backgroundElement" style={styles.panel}>
                <Field label={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}>
                  <TextInput
                    onChangeText={setCategoryDescription}
                    placeholder="Nombre"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={categoryDescription}
                  />
                </Field>

                <View style={styles.typeGrid}>
                  {CATEGORY_TYPE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={() => setCategoryType(option.value)}
                      style={({ pressed }) => [styles.typeOption, pressed && styles.pressed]}>
                      <ThemedView
                        type={categoryType === option.value ? 'backgroundSelected' : 'background'}
                        style={styles.typeOptionInner}>
                        <ThemedText type="smallBold" themeColor={categoryType === option.value ? 'text' : 'textSecondary'}>
                          {option.label}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.actionsRow}>
                  <ActionButton
                    disabled={isLoading}
                    label={editingCategoryId ? 'Guardar cambios' : 'Crear categoría'}
                    onPress={handleSaveCategory}
                    primary
                  />
                  {editingCategoryId && <ActionButton label="Cancelar" onPress={resetCategoryForm} />}
                </View>
              </ThemedView>

              <Field label="Buscar categorías">
                <TextInput
                  onChangeText={setCategorySearch}
                  placeholder="Descripción"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={categorySearch}
                />
              </Field>

              {visibleCategories.map((category) => (
                <ThemedView key={category.id} type="backgroundElement" style={styles.itemRow}>
                  <View style={styles.itemMain}>
                    <ThemedText type="smallBold">{category.description}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {categoryTypeLabel(category.type)} · {category.transaction_count} transacciones
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Creada {formatDate(category.created_at)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Actualizada {formatDate(category.updated_at)}
                    </ThemedText>
                  </View>
                  <View style={styles.itemActions}>
                    <ActionButton
                      label="Editar"
                      onPress={() => {
                        setEditingCategoryId(category.id);
                        setCategoryDescription(category.description);
                        setCategoryType(category.type);
                      }}
                    />
                    <ActionButton
                      disabled={category.transaction_count > 0}
                      label="Eliminar"
                      onPress={() => handleDeleteCategory(category)}
                    />
                  </View>
                </ThemedView>
              ))}
            </ThemedView>
          ) : (
            <ThemedView style={styles.section}>
              <ThemedView type="backgroundElement" style={styles.panel}>
                <Field label={editingTagId ? 'Editar tag' : 'Nuevo tag'}>
                  <TextInput
                    onChangeText={setTagDescription}
                    placeholder="Nombre"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    value={tagDescription}
                  />
                </Field>

                <View style={styles.actionsRow}>
                  <ActionButton
                    disabled={isLoading}
                    label={editingTagId ? 'Guardar cambios' : 'Crear tag'}
                    onPress={handleSaveTag}
                    primary
                  />
                  {editingTagId && <ActionButton label="Cancelar" onPress={resetTagForm} />}
                </View>
              </ThemedView>

              <Field label="Buscar tags">
                <TextInput
                  onChangeText={setTagSearch}
                  placeholder="Descripción"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  value={tagSearch}
                />
              </Field>

              {visibleTags.length === 0 ? (
                <ThemedText themeColor="textSecondary">No hay tags.</ThemedText>
              ) : (
                visibleTags.map((tag) => (
                  <ThemedView key={tag.id} type="backgroundElement" style={styles.itemRow}>
                    <View style={styles.itemMain}>
                      <ThemedText type="smallBold">{tag.description}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {tag.transaction_count} transacciones
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Creado {formatDate(tag.created_at)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Actualizado {formatDate(tag.updated_at)}
                      </ThemedText>
                    </View>
                    <View style={styles.itemActions}>
                      <ActionButton
                        label="Editar"
                        onPress={() => {
                          setEditingTagId(tag.id);
                          setTagDescription(tag.description);
                        }}
                      />
                      <ActionButton
                        disabled={tag.transaction_count > 0}
                        label="Eliminar"
                        onPress={() => handleDeleteTag(tag)}
                      />
                    </View>
                  </ThemedView>
                ))
              )}
            </ThemedView>
          )}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.segmentButton, pressed && styles.pressed]}>
      <ThemedView type={active ? 'background' : 'backgroundSelected'} style={styles.segmentButtonInner}>
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  primary,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView type={primary ? 'backgroundSelected' : 'background'} style={styles.actionButton}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
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
    paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.two : Spacing.five,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  segmentedControl: {
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
  },
  segmentButton: {
    flex: 1,
  },
  segmentButtonInner: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  section: {
    gap: Spacing.three,
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
    minWidth: 120,
  },
  typeOptionInner: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  itemRow: {
    alignItems: 'flex-start',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  itemMain: {
    flex: 1,
    gap: Spacing.one,
  },
  itemActions: {
    alignItems: 'stretch',
    gap: Spacing.two,
    minWidth: 112,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
