import { router, useNavigation } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useTheme } from '@/hooks/use-theme';
import type { Category, Tag, Transaction } from '@/lib/database';

type VisibleMonth = {
  month: number;
  year: number;
};

const MONTH_SWIPE_THRESHOLD = 72;

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getCurrentMonth(): VisibleMonth {
  const today = new Date();

  return { month: today.getMonth() + 1, year: today.getFullYear() };
}

function addMonths(visibleMonth: VisibleMonth, delta: number): VisibleMonth {
  const date = new Date(visibleMonth.year, visibleMonth.month - 1 + delta, 1);

  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function compareMonths(left: VisibleMonth, right: VisibleMonth) {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  return left.month - right.month;
}

function formatMonthPrefix(visibleMonth: VisibleMonth) {
  const month = String(visibleMonth.month).padStart(2, '0');

  return `${visibleMonth.year}-${month}-`;
}

function formatMonthLabel(visibleMonth: VisibleMonth) {
  const date = new Date(visibleMonth.year, visibleMonth.month - 1, 1);
  const month = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(date);

  return `${month.charAt(0).toLocaleUpperCase()}${month.slice(1)} ${visibleMonth.year}`;
}

function transactionMatchesDescriptionSearch(transaction: Transaction, search: string) {
  const needle = normalize(search);
  if (!needle) {
    return true;
  }

  return normalize(transaction.description ?? '').includes(needle);
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
  const { categories, removeTransactions, tags, transactions } = useCashioData();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [descriptionSearch, setDescriptionSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() => getCurrentMonth());
  const [chartMessage, setChartMessage] = useState('');
  const visibleMonthPrefix = formatMonthPrefix(visibleMonth);
  const visibleMonthLabel = formatMonthLabel(visibleMonth);
  const selectedTransactionIdSet = useMemo(() => new Set(selectedTransactionIds), [selectedTransactionIds]);
  const selectedTransactionCount = selectedTransactionIds.length;
  const isSelectionMode = selectedTransactionCount > 0;

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
          transaction.transaction_date.startsWith(visibleMonthPrefix) &&
          transactionMatchesDescriptionSearch(transaction, descriptionSearch) &&
          (!selectedCategory || transaction.category_id === selectedCategory.id) &&
          transactionMatchesTag(transaction, selectedTag)
      ),
    [descriptionSearch, selectedCategory, selectedTag, transactions, visibleMonthPrefix]
  );

  const summary = useMemo(
    () =>
      transactions.reduce(
        (totals, transaction) => {
          if (!transaction.transaction_date.startsWith(visibleMonthPrefix)) {
            return totals;
          }

          if (transaction.type === 'income') {
            totals.income += transaction.amount;
          } else {
            totals.expense += transaction.amount;
          }

          totals.balance = totals.income - totals.expense;
          return totals;
        },
        { balance: 0, expense: 0, income: 0 }
      ),
    [transactions, visibleMonthPrefix]
  );

  const hasActiveFilters = !!selectedCategory || !!selectedTag;

  function clearFilters() {
    setSelectedCategoryId(null);
    setSelectedTagId(null);
  }

  function cancelSelection() {
    setSelectedTransactionIds([]);
  }

  function selectTransaction(id: number) {
    setSelectedTransactionIds((currentIds) => (currentIds.includes(id) ? currentIds : [...currentIds, id]));
  }

  function toggleTransactionSelection(id: number) {
    setSelectedTransactionIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id]
    );
  }

  async function deleteSelectedTransactions(ids: number[]) {
    setChartMessage('');

    try {
      await removeTransactions(ids);
      setSelectedTransactionIds([]);
    } catch {
      setChartMessage('No se pudieron eliminar los registros.');
    }
  }

  function handleDeleteSelectedTransactions() {
    const ids = [...selectedTransactionIds];
    const count = ids.length;
    const message =
      count === 1 ? '¿Quieres eliminar el registro seleccionado?' : `¿Quieres eliminar ${count} registros seleccionados?`;

    if (count === 0) {
      return;
    }

    if (Platform.OS === 'web') {
      if (confirm(message)) {
        void deleteSelectedTransactions(ids);
      }
      return;
    }

    Alert.alert(
      'Eliminar registros',
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteSelectedTransactions(ids);
          },
        },
      ]
    );
  }

  function handleListPress() {
    if (isSelectionMode) {
      cancelSelection();
    }
  }

  function handleChartsPress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setChartMessage('Las gráficas se implementarán en una siguiente etapa.');
  }

  const goToPreviousMonth = useCallback(() => {
    setVisibleMonth((currentVisibleMonth) => addMonths(currentVisibleMonth, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setVisibleMonth((currentVisibleMonth) => {
      const nextMonth = addMonths(currentVisibleMonth, 1);

      return compareMonths(nextMonth, getCurrentMonth()) <= 0 ? nextMonth : currentVisibleMonth;
    });
  }, []);

  const handleMonthSwipe = useCallback(
    (translationX: number) => {
      if (translationX <= -MONTH_SWIPE_THRESHOLD) {
        goToPreviousMonth();
        return;
      }

      if (translationX >= MONTH_SWIPE_THRESHOLD) {
        goToNextMonth();
      }
    },
    [goToNextMonth, goToPreviousMonth]
  );

  const monthSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isSelectionMode)
        .activeOffsetX([-MONTH_SWIPE_THRESHOLD, MONTH_SWIPE_THRESHOLD])
        .failOffsetY([-Spacing.four, Spacing.four])
        .runOnJS(true)
        .onEnd((event) => {
          handleMonthSwipe(event.translationX);
        }),
    [handleMonthSwipe, isSelectionMode]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={[styles.phoneSurface, { borderColor: theme.backgroundSelected }]}>
          {isSelectionMode ? (
            <SelectionHeader
              count={selectedTransactionCount}
              onCancel={cancelSelection}
              onDelete={handleDeleteSelectedTransactions}
            />
          ) : (
            <ThemedView style={styles.header}>
              <IconButton label="Abrir menú" onPress={() => navigation.openDrawer()}>
                <AppIcon color={theme.text} name="menu" size={30} />
              </IconButton>

              <View style={styles.headerActions}>
                <ThemedView type="backgroundSelected" style={styles.searchWrap}>
                  <TextInput
                    accessibilityLabel="Buscar transacciones por descripción"
                    onChangeText={setDescriptionSearch}
                    placeholder="Buscar"
                    placeholderTextColor={theme.text}
                    style={[styles.searchInput, { color: theme.text }]}
                    value={descriptionSearch}
                  />
                </ThemedView>
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
          )}

          <BalanceSummary
            balance={summary.balance}
            expense={summary.expense}
            income={summary.income}
            monthLabel={visibleMonthLabel}
          />

          <GestureDetector gesture={monthSwipeGesture}>
            <ScrollView contentContainerStyle={styles.listContent} style={styles.list}>
              {filteredTransactions.length === 0 ? (
                <ThemedView style={styles.emptyState}>
                  <ThemedText type="subtitle" style={styles.emptyTitle}>
                    Sin registros
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    No hay registros en este mes.
                  </ThemedText>
                </ThemedView>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    onLongPress={() => selectTransaction(transaction.id)}
                    onPress={() => {
                      if (isSelectionMode) {
                        toggleTransactionSelection(transaction.id);
                      }
                    }}
                    selected={selectedTransactionIdSet.has(transaction.id)}
                    selectionMode={isSelectionMode}
                    transaction={transaction}
                  />
                ))
              )}
            </ScrollView>
          </GestureDetector>

          {!!chartMessage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.inlineMessage}>
              {chartMessage}
            </ThemedText>
          )}

          {!isSelectionMode && (
            <Pressable
              accessibilityLabel="Agregar registro"
              onPress={() => router.push('/new-transaction')}
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}>
              <AppIcon color={AppPalette.foregroundInverse} name="plus" size={36} />
            </Pressable>
          )}

          <ThemedView style={[styles.bottomBar, { borderTopColor: theme.backgroundSelected }]}>
            <IconButton label="Listado de registros" selected onPress={handleListPress}>
              <AppIcon color={theme.text} name="list" size={34} />
            </IconButton>
            <IconButton label="Gráficas" onPress={handleChartsPress}>
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
        selectedCategoryId={selectedCategoryId}
        selectedTagId={selectedTagId}
        setSelectedCategoryId={setSelectedCategoryId}
        setSelectedTagId={setSelectedTagId}
        tags={tags}
      />
    </ThemedView>
  );
}

function TransactionRow({
  onLongPress,
  onPress,
  selected,
  selectionMode,
  transaction,
}: {
  onLongPress: () => void;
  onPress: () => void;
  selected: boolean;
  selectionMode: boolean;
  transaction: Transaction;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityHint={selectionMode ? 'Toca para alternar selección' : 'Mantén pulsado para seleccionar'}
      accessibilityLabel={`Registro ${transaction.description || transaction.category_description}`}
      accessibilityState={{ selected }}
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.transactionRow}>
        <TypeIcon color={theme.text} selected={selected} type={transaction.type} />
        <View style={styles.transactionBody}>
          <ThemedText type="subtitle" style={styles.amount}>
            {formatMoney(transaction.amount)}
          </ThemedText>
          <View style={styles.metadataRow}>
            <AppIcon color={theme.textSecondary} name="folder" size={12} style={styles.metadataIcon} />
            <ThemedText type="small" style={styles.metadataText}>
              {transaction.category_description}
            </ThemedText>
          </View>
          {!!transaction.description && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              {transaction.description}
            </ThemedText>
          )}
          {!!transaction.tags && (
            <View style={styles.metadataRow}>
              <AppIcon color={theme.textSecondary} name="tag" size={12} style={styles.metadataIcon} />
              <ThemedText type="small" themeColor="textSecondary" style={[styles.description, styles.metadataText]}>
                {transaction.tags}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="smallBold" style={styles.dateText}>
          {transaction.transaction_date}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function SelectionHeader({
  count,
  onCancel,
  onDelete,
}: {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const label = count === 1 ? '1 registro seleccionado' : `${count} registros seleccionados`;

  return (
    <ThemedView type="backgroundSelected" style={styles.selectionHeader}>
      <FlatIconButton label="Cancelar eliminación" onPress={onCancel}>
        <AppIcon color={theme.text} name="arrow-left" size={28} />
      </FlatIconButton>
      <ThemedText type="smallBold" style={styles.selectionTitle}>
        {label}
      </ThemedText>
      <FlatIconButton label="Eliminar registros seleccionados" onPress={onDelete}>
        <AppIcon color={theme.text} name="trash-2" size={28} />
      </FlatIconButton>
    </ThemedView>
  );
}

function BalanceSummary({
  balance,
  expense,
  income,
  monthLabel,
}: {
  balance: number;
  expense: number;
  income: number;
  monthLabel: string;
}) {
  return (
    <View style={styles.summaryWrap}>
      <ThemedText type="smallBold" style={styles.summaryMonth}>
        {monthLabel}
      </ThemedText>
      <ThemedView type="backgroundSelected" style={styles.summaryPanel}>
        <View style={styles.summaryMainRow}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            Saldo
          </ThemedText>
          <ThemedText type="subtitle" style={styles.summaryAmount}>
            $ {formatMoney(balance)}
          </ThemedText>
        </View>
        <View style={styles.summaryDetailRow}>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            Ingresos: $ {formatMoney(income)}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            Egresos: $ {formatMoney(expense)}
          </ThemedText>
        </View>
      </ThemedView>
    </View>
  );
}

function FilterModal({
  categories,
  isVisible,
  onClear,
  onClose,
  selectedCategoryId,
  selectedTagId,
  setSelectedCategoryId,
  setSelectedTagId,
  tags,
}: {
  categories: Category[];
  isVisible: boolean;
  onClear: () => void;
  onClose: () => void;
  selectedCategoryId: number | null;
  selectedTagId: number | null;
  setSelectedCategoryId: (value: number | null) => void;
  setSelectedTagId: (value: number | null) => void;
  tags: Tag[];
}) {
  const theme = useTheme();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const categoryItems = useMemo(
    () => [
      { label: 'Todas', value: 0 },
      ...categories.map((category) => ({ label: category.description, value: category.id })),
    ],
    [categories]
  );

  const tagItems = useMemo(
    () => [
      { label: 'Todos', value: 0 },
      ...tags.map((tag) => ({ label: tag.description, value: tag.id })),
    ],
    [tags]
  );

  function clearAndClose() {
    onClear();
    setCategorySearch('');
    setTagSearch('');
    setIsCategoryOpen(false);
    setIsTagOpen(false);
  }

  function closeModal() {
    setIsCategoryOpen(false);
    setIsTagOpen(false);
    setCategorySearch('');
    setTagSearch('');
    onClose();
  }

  function setCategoryFilterValue(nextValue: (currentValue: number | null) => number | null) {
    const next = nextValue(selectedCategoryId ?? 0);
    setSelectedCategoryId(next === 0 ? null : next);
  }

  function setTagFilterValue(nextValue: (currentValue: number | null) => number | null) {
    const next = nextValue(selectedTagId ?? 0);
    setSelectedTagId(next === 0 ? null : next);
  }

  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={closeModal}>
      <Pressable style={styles.modalBackdrop} onPress={closeModal}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={styles.filterPanel}>
            <ThemedText type="subtitle" style={styles.panelTitle}>
              Filtros
            </ThemedText>

            <View style={[styles.filterDropdownField, { zIndex: isCategoryOpen ? 30 : 10 }]}>
              <ThemedText type="smallBold">Categorías</ThemedText>
              <DropDownPicker<number>
                ArrowDownIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="chevron-down" size={22} />
                  </View>
                )}
                ArrowUpIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="chevron-up" size={22} />
                  </View>
                )}
                TickIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="check" size={20} />
                  </View>
                )}
                dropDownContainerStyle={[
                  styles.filterDropdownMenu,
                  { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                ]}
                items={categoryItems}
                labelStyle={styles.filterDropdownLabel}
                listItemContainerStyle={styles.filterDropdownItem}
                listItemLabelStyle={{ color: theme.text }}
                listMode="SCROLLVIEW"
                maxHeight={180}
                onChangeSearchText={setCategorySearch}
                onOpen={() => setIsTagOpen(false)}
                open={isCategoryOpen}
                placeholder="Todas"
                placeholderStyle={{ color: theme.textSecondary }}
                searchPlaceholder="Buscar categoría"
                searchPlaceholderTextColor={theme.textSecondary}
                searchable
                searchTextInputProps={{ value: categorySearch }}
                searchTextInputStyle={[
                  styles.filterDropdownSearchInput,
                  { borderColor: theme.backgroundSelected, color: theme.text },
                ]}
                selectedItemContainerStyle={{ backgroundColor: theme.backgroundSelected }}
                selectedItemLabelStyle={{ color: theme.text, fontWeight: '700' }}
                setOpen={setIsCategoryOpen}
                setValue={setCategoryFilterValue}
                style={[
                  styles.filterDropdown,
                  { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                ]}
                textStyle={{ color: theme.text }}
                value={selectedCategoryId ?? 0}
                zIndex={isCategoryOpen ? 3000 : 1000}
                zIndexInverse={1000}
              />
            </View>

            <View style={[styles.filterDropdownField, { zIndex: isTagOpen ? 30 : 10 }]}>
              <ThemedText type="smallBold">Tags</ThemedText>
              <DropDownPicker<number>
                ArrowDownIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="chevron-down" size={22} />
                  </View>
                )}
                ArrowUpIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="chevron-up" size={22} />
                  </View>
                )}
                TickIconComponent={({ style }) => (
                  <View style={style}>
                    <AppIcon color={theme.text} name="check" size={20} />
                  </View>
                )}
                dropDownContainerStyle={[
                  styles.filterDropdownMenu,
                  { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                ]}
                items={tagItems}
                labelStyle={styles.filterDropdownLabel}
                listItemContainerStyle={styles.filterDropdownItem}
                listItemLabelStyle={{ color: theme.text }}
                listMode="SCROLLVIEW"
                maxHeight={180}
                onChangeSearchText={setTagSearch}
                onOpen={() => setIsCategoryOpen(false)}
                open={isTagOpen}
                placeholder="Todos"
                placeholderStyle={{ color: theme.textSecondary }}
                searchPlaceholder="Buscar tag"
                searchPlaceholderTextColor={theme.textSecondary}
                searchable
                searchTextInputProps={{ value: tagSearch }}
                searchTextInputStyle={[
                  styles.filterDropdownSearchInput,
                  { borderColor: theme.backgroundSelected, color: theme.text },
                ]}
                selectedItemContainerStyle={{ backgroundColor: theme.backgroundSelected }}
                selectedItemLabelStyle={{ color: theme.text, fontWeight: '700' }}
                setOpen={setIsTagOpen}
                setValue={setTagFilterValue}
                style={[
                  styles.filterDropdown,
                  { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
                ]}
                textStyle={{ color: theme.text }}
                value={selectedTagId ?? 0}
                zIndex={isTagOpen ? 3000 : 1000}
                zIndexInverse={1000}
              />
            </View>

            <View style={styles.filterActions}>
              <MenuButton label="Limpiar" onPress={clearAndClose} />
              <MenuButton label="Aplicar" onPress={closeModal} />
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

function FlatIconButton({
  children,
  label,
  onPress,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.flatIconButton, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

function TypeIcon({ color, selected, type }: { color: string; selected?: boolean; type: Transaction['type'] }) {
  const iconColor = type === 'income' ? AppPalette.incomeGreen : color;
  const iconName = selected ? 'check' : type === 'income' ? 'arrow-up' : 'arrow-down';

  return (
    <View style={[styles.typeIcon, { borderColor: iconColor }]}>
      <AppIcon color={iconColor} name={iconName} size={18} />
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
    gap: Spacing.two,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  selectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  selectionTitle: {
    flex: 1,
    textAlign: 'center',
  },
  searchWrap: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    height: 38,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 0,
    paddingVertical: 0,
    textAlign: 'center',
    width: '100%',
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
  flatIconButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  list: {
    flex: 1,
    marginTop: Spacing.three,
  },
  listContent: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + 152,
  },
  transactionRow: {
    alignItems: 'flex-start',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 64,
    padding: Spacing.two,
  },
  transactionBody: {
    flex: 1,
    gap: Spacing.half,
  },
  amount: {
    fontSize: 21,
    lineHeight: 25,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  metadataIcon: {
    marginTop: 1,
  },
  metadataRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  metadataText: {
    flexShrink: 1,
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
  summaryWrap: {
    gap: Spacing.one,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  summaryMonth: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  summaryPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  summaryMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  summaryAmount: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'right',
  },
  summaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summaryDetail: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
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
    backgroundColor: AppPalette.brandOrange,
    borderColor: 'transparent',
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
  fabPressed: {
    backgroundColor: AppPalette.brandOrangeActive,
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
  filterDropdownField: {
    gap: Spacing.two,
  },
  filterDropdown: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  filterDropdownLabel: {
    fontWeight: '700',
  },
  filterDropdownMenu: {
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  filterDropdownItem: {
    minHeight: 44,
  },
  filterDropdownSearchInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 40,
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
