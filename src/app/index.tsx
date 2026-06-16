import { router, useNavigation } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import type { Category, Tag, Transaction } from '@/lib/database';

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function transactionMatchesSearch(transaction: Transaction, search: string) {
  const needle = normalize(search);
  if (!needle) {
    return true;
  }

  return [
    transaction.category_description,
    transaction.description ?? '',
    transaction.tags,
    transaction.transaction_date,
    String(transaction.amount),
  ].some((value) => normalize(value).includes(needle));
}

function transactionMatchesTag(transaction: Transaction, tag: Tag | null) {
  if (!tag) {
    return true;
  }

  return transaction.tags
    .split(',')
    .map((value) => normalize(value))
    .includes(normalize(tag.description));
}

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const { categories, tags, transactions } = useCashioData();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [chartMessage, setChartMessage] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === selectedTagId) ?? null,
    [tags, selectedTagId]
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transactionMatchesSearch(transaction, search) &&
          (!selectedCategory || transaction.category_id === selectedCategory.id) &&
          transactionMatchesTag(transaction, selectedTag)
      ),
    [search, selectedCategory, selectedTag, transactions]
  );

  const hasActiveFilters = !!search.trim() || !!selectedCategory || !!selectedTag;

  function clearFilters() {
    setSearch('');
    setSelectedCategoryId(null);
    setSelectedTagId(null);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={[styles.phoneSurface, { borderColor: theme.backgroundSelected }]}>
          <ThemedView style={styles.header}>
            <IconButton label="Abrir menú" onPress={() => navigation.openDrawer()}>
              <AppIcon color={theme.text} name="menu" size={30} />
            </IconButton>

            <View style={styles.headerActions}>
              <IconButton label="Filtrar" selected={hasActiveFilters} onPress={() => setIsFilterOpen(true)}>
                <AppIcon color={theme.text} name="filter" size={30} />
              </IconButton>
              <ThemedView style={styles.avatar}>
                <ThemedText type="smallBold" style={styles.avatarText}>
                  OB
                </ThemedText>
              </ThemedView>
            </View>
          </ThemedView>

          <ScrollView contentContainerStyle={styles.listContent} style={styles.list}>
            {filteredTransactions.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Sin registros
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  Usa el botón + para agregar tu primer movimiento.
                </ThemedText>
              </ThemedView>
            ) : (
              filteredTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))
            )}
          </ScrollView>

          {!!chartMessage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.inlineMessage}>
              {chartMessage}
            </ThemedText>
          )}

          <Pressable
            accessibilityLabel="Agregar registro"
            onPress={() => router.push('/new-transaction')}
            style={({ pressed }) => [
              styles.fab,
              { borderColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <AppIcon color="#FFFFFF" name="plus" size={36} />
          </Pressable>

          <ThemedView style={[styles.bottomBar, { borderTopColor: theme.backgroundSelected }]}>
            <IconButton label="Listado de registros" selected onPress={() => undefined}>
              <AppIcon color={theme.text} name="list" size={34} />
            </IconButton>
            <IconButton
              label="Gráficas"
              onPress={() => setChartMessage('Las gráficas se implementarán en una siguiente etapa.')}>
              <AppIcon color={theme.text} name="bar-chart-2" size={34} />
            </IconButton>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>

      <FilterModal
        categories={categories}
        isVisible={isFilterOpen}
        onClear={clearFilters}
        onClose={() => setIsFilterOpen(false)}
        search={search}
        selectedCategoryId={selectedCategoryId}
        selectedTagId={selectedTagId}
        setSearch={setSearch}
        setSelectedCategoryId={setSelectedCategoryId}
        setSelectedTagId={setSelectedTagId}
        tags={tags}
        themeTextSecondary={theme.textSecondary}
      />
    </ThemedView>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.transactionRow}>
      <TypeIcon color={theme.text} type={transaction.type} />
      <View style={styles.transactionBody}>
        <ThemedText type="subtitle" style={styles.amount}>
          {formatMoney(transaction.amount)}
        </ThemedText>
        <ThemedText type="small">{transaction.category_description}</ThemedText>
        {!!transaction.description && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {transaction.description}
          </ThemedText>
        )}
        {!!transaction.tags && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {transaction.tags}
          </ThemedText>
        )}
      </View>
      <ThemedText type="smallBold" style={styles.dateText}>
        {transaction.transaction_date}
      </ThemedText>
    </ThemedView>
  );
}

function FilterModal({
  categories,
  isVisible,
  onClear,
  onClose,
  search,
  selectedCategoryId,
  selectedTagId,
  setSearch,
  setSelectedCategoryId,
  setSelectedTagId,
  tags,
  themeTextSecondary,
}: {
  categories: Category[];
  isVisible: boolean;
  onClear: () => void;
  onClose: () => void;
  search: string;
  selectedCategoryId: number | null;
  selectedTagId: number | null;
  setSearch: (value: string) => void;
  setSelectedCategoryId: (value: number | null) => void;
  setSelectedTagId: (value: number | null) => void;
  tags: Tag[];
  themeTextSecondary: string;
}) {
  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={styles.filterPanel}>
            <ThemedText type="subtitle" style={styles.panelTitle}>
              Filtros
            </ThemedText>
            <TextInput
              onChangeText={setSearch}
              placeholder="Buscar por texto"
              placeholderTextColor={themeTextSecondary}
              style={styles.filterInput}
              value={search}
            />

            <ThemedText type="smallBold">Categorías</ThemedText>
            <View style={styles.chipWrap}>
              <FilterChip
                label="Todas"
                selected={selectedCategoryId === null}
                onPress={() => setSelectedCategoryId(null)}
              />
              {categories.map((category) => (
                <FilterChip
                  key={category.id}
                  label={category.description}
                  selected={selectedCategoryId === category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </View>

            <ThemedText type="smallBold">Tags</ThemedText>
            <View style={styles.chipWrap}>
              <FilterChip label="Todos" selected={selectedTagId === null} onPress={() => setSelectedTagId(null)} />
              {tags.map((tag) => (
                <FilterChip
                  key={tag.id}
                  label={tag.description}
                  selected={selectedTagId === tag.id}
                  onPress={() => setSelectedTagId(tag.id)}
                />
              ))}
            </View>

            <View style={styles.filterActions}>
              <MenuButton label="Limpiar" onPress={onClear} />
              <MenuButton label="Aplicar" onPress={onClose} />
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundSelected" style={styles.menuButton}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function FilterChip({
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
      <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.filterChip}>
        <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function IconButton({
  children,
  label,
  onPress,
  selected,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.iconButton}>
        {children}
      </ThemedView>
    </Pressable>
  );
}

function TypeIcon({ color, type }: { color: string; type: Transaction['type'] }) {
  return (
    <View style={[styles.typeIcon, { borderColor: color }]}>
      <AppIcon color={color} name={type === 'income' ? 'check' : 'minus'} size={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.three : 0,
  },
  phoneSurface: {
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    position: 'relative',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#126B8D',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  list: {
    flex: 1,
    marginTop: Spacing.four,
  },
  listContent: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + 152,
  },
  transactionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 64,
  },
  transactionBody: {
    flex: 1,
    gap: Spacing.half,
  },
  amount: {
    fontSize: 24,
    lineHeight: 28,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  dateText: {
    minWidth: 96,
    textAlign: 'right',
  },
  typeIcon: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    marginTop: Spacing.half,
    width: 30,
  },
  bottomBar: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: BottomTabInset + Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#000000',
    borderColor: '#0B3444',
    borderRadius: Spacing.two,
    borderWidth: 2,
    bottom: BottomTabInset + 104,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.three,
    width: 64,
    zIndex: 2,
  },
  inlineMessage: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 360,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  emptyText: {
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'flex-start',
    padding: Spacing.three,
    paddingTop: Spacing.six,
  },
  filterPanel: {
    alignSelf: 'center',
    borderRadius: Spacing.two,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  panelTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  menuButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  filterInput: {
    borderColor: '#C8CBD0',
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
  filterChip: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
});
