import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import { CashioValidationError } from '@/lib/cashio-repository';
import type { Category, TransactionType } from '@/lib/database';

type TransactionFormProps = {
  onSaved?: () => void;
};

function matchesSearch(value: string, search: string) {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function canUseCategory(category: Category, transactionType: TransactionType) {
  return category.type === null || category.type === 'both' || category.type === transactionType;
}

export function TransactionForm({ onSaved }: TransactionFormProps) {
  const theme = useTheme();
  const { categories, tags, isLoading, addCategory, addTag, addTransaction } = useCashioData();
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categorySearch, setCategorySearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) => canUseCategory(category, transactionType) && matchesSearch(category.description, categorySearch)
      ),
    [categories, categorySearch, transactionType]
  );

  const visibleTags = useMemo(
    () => tags.filter((tag) => matchesSearch(tag.description, tagSearch)),
    [tags, tagSearch]
  );

  const categorySearchMatchesExisting = useMemo(
    () =>
      categories.some(
        (category) =>
          category.description.trim().toLocaleLowerCase() ===
          categorySearch.trim().toLocaleLowerCase()
      ),
    [categories, categorySearch]
  );

  const tagSearchMatchesExisting = useMemo(
    () =>
      tags.some((tag) => tag.description.trim().toLocaleLowerCase() === tagSearch.trim().toLocaleLowerCase()),
    [tags, tagSearch]
  );

  useEffect(() => {
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
    if (selectedCategory && !canUseCategory(selectedCategory, transactionType)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId, transactionType]);

  function handleError(error: unknown) {
    if (error instanceof CashioValidationError) {
      setMessage(error.message);
      return;
    }
    setMessage('No se pudo completar la acción.');
  }

  function resetForm() {
    setTransactionType('expense');
    setAmount('');
    setDescription('');
    setSelectedCategoryId(null);
    setSelectedTagIds([]);
    setCategorySearch('');
    setTagSearch('');
    setTransactionDate(new Date().toISOString().slice(0, 10));
  }

  async function handleCreateCategory() {
    try {
      const created = await addCategory({ description: categorySearch, type: transactionType });
      if (created) {
        setSelectedCategoryId(created.id);
        setCategorySearch('');
        setMessage(`Categoría "${created.description}" creada.`);
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function handleCreateTag() {
    try {
      const created = await addTag({ description: tagSearch });
      if (created) {
        setSelectedTagIds((current) => [...current, created.id]);
        setTagSearch('');
        setMessage(`Tag "${created.description}" creado.`);
      }
    } catch (error) {
      handleError(error);
    }
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  }

  async function handleSaveTransaction() {
    setIsSaving(true);
    setMessage('');

    try {
      await addTransaction({
        type: transactionType,
        amount: Number(amount.replace(',', '.')),
        description,
        transactionDate,
        categoryId: selectedCategoryId ?? 0,
        tagIds: selectedTagIds,
      });
      resetForm();
      setMessage('Transacción guardada.');
      onSaved?.();
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.panel}>
      <ThemedView type="backgroundSelected" style={styles.segmentedControl}>
        <SegmentButton
          active={transactionType === 'expense'}
          label="Egreso"
          onPress={() => setTransactionType('expense')}
        />
        <SegmentButton
          active={transactionType === 'income'}
          label="Ingreso"
          onPress={() => setTransactionType('income')}
        />
      </ThemedView>

      <Field label="Monto">
        <TextInput
          inputMode="decimal"
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          placeholder="$0"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={amount}
        />
      </Field>

      <Field label="Descripción">
        <TextInput
          onChangeText={setDescription}
          placeholder="Opcional"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={description}
        />
      </Field>

      <Field label="Fecha">
        <TextInput
          onChangeText={setTransactionDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={transactionDate}
        />
      </Field>

      <Field label="Categoría">
        <TextInput
          onChangeText={setCategorySearch}
          placeholder="Buscar o crear"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={categorySearch}
        />
        <View style={styles.chipWrap}>
          {availableCategories.map((category) => (
            <Chip
              key={category.id}
              label={category.description}
              selected={selectedCategoryId === category.id}
              onPress={() => setSelectedCategoryId(category.id)}
            />
          ))}
        </View>
        {!!categorySearch.trim() && !categorySearchMatchesExisting && (
          <ActionButton label={`Crear "${categorySearch.trim()}"`} onPress={handleCreateCategory} />
        )}
      </Field>

      <Field label="Tags">
        <TextInput
          onChangeText={setTagSearch}
          placeholder="Buscar o crear"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          value={tagSearch}
        />
        <View style={styles.chipWrap}>
          {visibleTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.description}
              selected={selectedTagIds.includes(tag.id)}
              onPress={() => toggleTag(tag.id)}
            />
          ))}
        </View>
        {!!tagSearch.trim() && !tagSearchMatchesExisting && (
          <ActionButton label={`Crear "${tagSearch.trim()}"`} onPress={handleCreateTag} />
        )}
      </Field>

      {!!message && (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}

      <ActionButton
        disabled={isSaving || isLoading}
        label={isSaving ? 'Guardando...' : 'Guardar transacción'}
        onPress={handleSaveTransaction}
        primary
      />
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

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.chip}>
        <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
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
  panel: {
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionButton: {
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
