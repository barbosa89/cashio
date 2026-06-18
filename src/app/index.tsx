import { router, useNavigation } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type DimensionValue,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartesianChart, Line, Pie, PolarChart } from 'victory-native';

import { AppIcon } from '@/components/app-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppPalette, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCashioData } from '@/hooks/use-cashio-data';
import { useCashioSettings } from '@/hooks/use-cashio-settings';
import { useTheme } from '@/hooks/use-theme';
import type { Category, Tag, Transaction } from '@/lib/database';

type VisibleMonth = {
  month: number;
  year: number;
};

type ActiveView = 'list' | 'charts';

type DailyChartPoint = {
  balance: number;
  day: number;
  expense: number;
  income: number;
};

type CategoryChartPoint = {
  amount: number;
  color: string;
  label: string;
};

type MonthlySummary = {
  balance: number;
  expense: number;
  income: number;
  openingBalance: number;
};

const MONTH_SWIPE_THRESHOLD = 72;
const CHART_CATEGORY_COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#14b8a6', '#eab308'];

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactMoney(value: number) {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absoluteValue >= 1_000_000) {
    return `${sign}$ ${(absoluteValue / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${sign}$ ${Math.round(absoluteValue / 1_000)}k`;
  }

  return `${sign}$ ${formatMoney(absoluteValue)}`;
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

function formatMonthKey(visibleMonth: VisibleMonth) {
  return formatMonthPrefix(visibleMonth).slice(0, 7);
}

function formatMonthLabel(visibleMonth: VisibleMonth) {
  const date = new Date(visibleMonth.year, visibleMonth.month - 1, 1);
  const month = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(date);

  return `${month.charAt(0).toLocaleUpperCase()}${month.slice(1)} ${visibleMonth.year}`;
}

function getDaysInMonth(visibleMonth: VisibleMonth) {
  return new Date(visibleMonth.year, visibleMonth.month, 0).getDate();
}

function getTransactionDay(transaction: Transaction) {
  return Number(transaction.transaction_date.slice(8, 10));
}

function buildDailyChartData(
  monthTransactions: Transaction[],
  visibleMonth: VisibleMonth,
  openingBalance: number
): DailyChartPoint[] {
  const days = Array.from({ length: getDaysInMonth(visibleMonth) }, (_, index) => ({
    balance: 0,
    day: index + 1,
    expense: 0,
    income: 0,
  }));

  for (const transaction of monthTransactions) {
    const dayIndex = getTransactionDay(transaction) - 1;
    const point = days[dayIndex];

    if (!point) {
      continue;
    }

    if (transaction.type === 'income') {
      point.income += transaction.amount;
    } else {
      point.expense += transaction.amount;
    }
  }

  let runningBalance = openingBalance;
  return days.map((point) => {
    runningBalance += point.income - point.expense;

    return {
      ...point,
      balance: runningBalance,
    };
  });
}

function groupByCategory(monthTransactions: Transaction[], type: Transaction['type']): CategoryChartPoint[] {
  const totals = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (transaction.type !== type) {
      continue;
    }

    totals.set(
      transaction.category_description,
      (totals.get(transaction.category_description) ?? 0) + transaction.amount
    );
  }

  return [...totals.entries()]
    .map(([label, amount]) => ({ amount, label }))
    .sort((left, right) => right.amount - left.amount)
    .map((metric, index) => ({
      ...metric,
      color: CHART_CATEGORY_COLORS[index % CHART_CATEGORY_COLORS.length],
    }));
}

function getTopCategoriesWithOther(categoryData: CategoryChartPoint[], limit: number): CategoryChartPoint[] {
  if (categoryData.length <= limit) {
    return categoryData;
  }

  const topCategories = categoryData.slice(0, limit);
  const otherAmount = categoryData.slice(limit).reduce((total, category) => total + category.amount, 0);

  return [
    ...topCategories,
    {
      amount: otherAmount,
      color: CHART_CATEGORY_COLORS[limit % CHART_CATEGORY_COLORS.length],
      label: 'Otros',
    },
  ];
}

function getChartDomain(values: number[]): [number, number] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);

  if (min === max) {
    return [min - 1, max + 1];
  }

  const padding = Math.max((max - min) * 0.1, 1);

  return [Math.floor(min - padding), Math.ceil(max + padding)];
}

function getBalanceAxisLabels(domain: [number, number]) {
  const [min, max] = domain;
  const middle = min + (max - min) / 2;

  return [max, middle, min].map((value) => Math.round(value));
}

function getZeroLineTop(domain: [number, number]): DimensionValue | null {
  const [min, max] = domain;

  if (min >= 0 || max <= 0) {
    return null;
  }

  return `${((max - 0) / (max - min)) * 100}%`;
}

function getMonthStartBalance(dailyData: DailyChartPoint[], openingBalance: number) {
  const firstDay = dailyData[0];

  if (!firstDay) {
    return openingBalance;
  }

  return firstDay.balance - firstDay.income + firstDay.expense;
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
  const { categories, monthlySummaries, removeTransactions, tags, transactions } = useCashioData();
  const { settings } = useCashioSettings();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [descriptionSearch, setDescriptionSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() => getCurrentMonth());
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [inlineMessage, setInlineMessage] = useState('');
  const visibleMonthPrefix = formatMonthPrefix(visibleMonth);
  const visibleMonthKey = formatMonthKey(visibleMonth);
  const visibleMonthLabel = formatMonthLabel(visibleMonth);
  const shouldAccumulatePreviousBalances = settings.accumulatePreviousBalances;
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

  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.transaction_date.startsWith(visibleMonthPrefix)),
    [transactions, visibleMonthPrefix]
  );

  const visibleMonthSummary = useMemo(
    () => monthlySummaries.find((monthlySummary) => monthlySummary.month === visibleMonthKey) ?? null,
    [monthlySummaries, visibleMonthKey]
  );

  const openingBalance = useMemo(() => {
    if (!shouldAccumulatePreviousBalances) {
      return 0;
    }

    return monthlySummaries.reduce(
      (total, monthlySummary) =>
        monthlySummary.month < visibleMonthKey ? total + monthlySummary.net_total : total,
      0
    );
  }, [monthlySummaries, shouldAccumulatePreviousBalances, visibleMonthKey]);

  const filteredTransactions = useMemo(
    () =>
      monthlyTransactions.filter(
        (transaction) =>
          transactionMatchesDescriptionSearch(transaction, descriptionSearch) &&
          (!selectedCategory || transaction.category_id === selectedCategory.id) &&
          transactionMatchesTag(transaction, selectedTag)
      ),
    [descriptionSearch, monthlyTransactions, selectedCategory, selectedTag]
  );

  const summary = useMemo<MonthlySummary>(() => {
    const income = visibleMonthSummary?.income_total ?? 0;
    const expense = visibleMonthSummary?.expense_total ?? 0;
    const net = visibleMonthSummary?.net_total ?? 0;

    return {
      balance: openingBalance + net,
      expense,
      income,
      openingBalance,
    };
  }, [openingBalance, visibleMonthSummary]);

  const dailyChartData = useMemo(
    () => buildDailyChartData(monthlyTransactions, visibleMonth, openingBalance),
    [monthlyTransactions, openingBalance, visibleMonth]
  );

  const expenseCategoryData = useMemo(
    () => groupByCategory(monthlyTransactions, 'expense'),
    [monthlyTransactions]
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
    setInlineMessage('');

    try {
      await removeTransactions(ids);
      setSelectedTransactionIds([]);
    } catch {
      setInlineMessage('No se pudieron eliminar los registros.');
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
      return;
    }

    setActiveView('list');
  }

  function handleChartsPress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setActiveView('charts');
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
              </View>
            </ThemedView>
          )}

          <BalanceSummary
            balance={summary.balance}
            expense={summary.expense}
            income={summary.income}
            monthLabel={visibleMonthLabel}
            openingBalance={summary.openingBalance}
            showOpeningBalance={shouldAccumulatePreviousBalances}
          />

          <GestureDetector gesture={monthSwipeGesture}>
            {activeView === 'list' ? (
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
            ) : (
              <ScrollView contentContainerStyle={styles.chartContent} style={styles.list}>
                <MonthlyChartsPanel
                  dailyData={dailyChartData}
                  expenseCategoryData={expenseCategoryData}
                  monthTransactionCount={monthlyTransactions.length}
                  summary={summary}
                />
              </ScrollView>
            )}
          </GestureDetector>

          {!!inlineMessage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.inlineMessage}>
              {inlineMessage}
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
            <IconButton label="Listado de registros" selected={activeView === 'list'} onPress={handleListPress}>
              <AppIcon color={theme.text} name="list" size={34} />
            </IconButton>
            <IconButton label="Gráficas" selected={activeView === 'charts'} onPress={handleChartsPress}>
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
  openingBalance,
  showOpeningBalance,
}: {
  balance: number;
  expense: number;
  income: number;
  monthLabel: string;
  openingBalance: number;
  showOpeningBalance: boolean;
}) {
  const theme = useTheme();

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
        {showOpeningBalance && (
          <View style={[styles.summaryOpeningRow, { borderTopColor: theme.textSecondary }]}>
            <ThemedText type="smallBold" style={styles.summaryDetail}>
              Saldo anterior
            </ThemedText>
            <ThemedText type="smallBold" style={styles.summaryDetailAmount}>
              $ {formatMoney(openingBalance)}
            </ThemedText>
          </View>
        )}
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

function MonthlyChartsPanel({
  dailyData,
  expenseCategoryData,
  monthTransactionCount,
  summary,
}: {
  dailyData: DailyChartPoint[];
  expenseCategoryData: CategoryChartPoint[];
  monthTransactionCount: number;
  summary: MonthlySummary;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(210, Math.min(300, width - 128));
  const lineDomain = getChartDomain(dailyData.map((point) => point.balance));
  const balanceAxisLabels = getBalanceAxisLabels(lineDomain);
  const zeroLineTop = getZeroLineTop(lineDomain);
  const monthStartBalance = getMonthStartBalance(dailyData, summary.openingBalance);
  const pieData = getTopCategoriesWithOther(expenseCategoryData, 5);
  const barData = expenseCategoryData.slice(0, 6);
  const lineColor = summary.balance >= 0 ? AppPalette.incomeGreen : AppPalette.brandOrange;

  if (monthTransactionCount === 0 && summary.openingBalance === 0) {
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          Sin datos
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          No hay datos para graficar este mes.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.chartsPanel}>
      <ThemedView type="backgroundSelected" style={styles.chartMetricGrid}>
        <ChartMetric label="Ingresos" value={`$ ${formatMoney(summary.income)}`} />
        <ChartMetric label="Egresos" value={`$ ${formatMoney(summary.expense)}`} />
        <ChartMetric label="Saldo" value={`$ ${formatMoney(summary.balance)}`} />
      </ThemedView>

      <ChartCard title="Saldo acumulado diario">
        <View style={styles.balanceChartRow}>
          <View style={styles.balanceAxisLabels}>
            {balanceAxisLabels.map((value, index) => (
              <ThemedText key={`${value}-${index}`} type="small" themeColor="textSecondary" style={styles.balanceAxisLabel}>
                {formatCompactMoney(value)}
              </ThemedText>
            ))}
          </View>
          <View style={[styles.chartFrame, { width: chartWidth }]}>
            {zeroLineTop && (
              <View pointerEvents="none" style={[styles.zeroLine, { borderTopColor: theme.textSecondary, top: zeroLineTop }]} />
            )}
            <CartesianChart
              axisOptions={{
                formatXLabel: (value) => `${value}`,
                formatYLabel: () => '',
                labelColor: theme.textSecondary,
                lineColor: theme.textSecondary,
                lineWidth: { frame: 0, grid: 1 },
                tickCount: { x: 4, y: 4 },
              }}
              data={dailyData}
              domain={{ x: [1, dailyData.length], y: lineDomain }}
              domainPadding={{ bottom: Spacing.two, left: Spacing.two, right: Spacing.two, top: Spacing.two }}
              explicitSize={{ height: 190, width: chartWidth }}
              padding={{ bottom: Spacing.two, left: Spacing.two, right: Spacing.two, top: Spacing.two }}
              xKey="day"
              yKeys={['balance']}>
              {({ points }) => (
                <Line
                  color={lineColor}
                  curveType="natural"
                  points={points.balance}
                  strokeCap="round"
                  strokeJoin="round"
                  strokeWidth={3}
                />
              )}
            </CartesianChart>
          </View>
        </View>
        <View style={styles.chartFooter}>
          <ThemedText type="small" themeColor="textSecondary">
            Inicio: {formatCompactMoney(monthStartBalance)}
          </ThemedText>
          <ThemedText type="smallBold">Final: $ {formatMoney(summary.balance)}</ThemedText>
        </View>
      </ChartCard>

      {expenseCategoryData.length === 0 ? (
        <ThemedView type="backgroundSelected" style={styles.chartCard}>
          <ThemedText type="smallBold" style={styles.chartTitle}>
            Egresos por categoría
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            Sin egresos este mes.
          </ThemedText>
        </ThemedView>
      ) : (
        <>
          <ChartCard title="Egresos por categoría">
            <View style={styles.pieChartRow}>
              <PolarChart
                colorKey="color"
                data={pieData}
                explicitSize={{ height: 176, width: 176 }}
                labelKey="label"
                valueKey="amount">
                <Pie.Chart innerRadius="58%" size={168} startAngle={-90}>
                  {() => <Pie.Slice />}
                </Pie.Chart>
              </PolarChart>
              <ChartLegend data={pieData} total={summary.expense} />
            </View>
          </ChartCard>

          <ChartCard title="Top categorías">
            <TopCategoryBars data={barData} total={summary.expense} />
          </ChartCard>
        </>
      )}
    </View>
  );
}

function TopCategoryBars({ data, total }: { data: CategoryChartPoint[]; total: number }) {
  const theme = useTheme();
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);

  return (
    <View style={styles.topCategoryList}>
      {data.map((item) => {
        const percentage = total > 0 ? Math.round((item.amount / total) * 100) : 0;
        const barWidth: DimensionValue = `${Math.max((item.amount / maxAmount) * 100, 4)}%`;

        return (
          <View key={item.label} style={styles.topCategoryItem}>
            <View style={styles.topCategoryHeader}>
              <View style={styles.topCategoryLabelWrap}>
                <View style={[styles.chartLegendSwatch, { backgroundColor: item.color }]} />
                <ThemedText type="smallBold" style={styles.topCategoryLabel} numberOfLines={1}>
                  {item.label}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.topCategoryAmount}>
                $ {formatMoney(item.amount)}
              </ThemedText>
            </View>
            <View style={[styles.topCategoryTrack, { backgroundColor: theme.background }]}>
              <View style={[styles.topCategoryBar, { backgroundColor: item.color, width: barWidth }]} />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.topCategoryPercent}>
              {percentage}%
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function ChartMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chartMetric}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.chartMetricLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.chartMetricValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function ChartCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.chartCard}>
      <ThemedText type="smallBold" style={styles.chartTitle}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function ChartLegend({ data, total }: { data: CategoryChartPoint[]; total: number }) {
  return (
    <View style={styles.chartLegend}>
      {data.map((item) => (
        <View key={item.label} style={styles.chartLegendRow}>
          <View style={[styles.chartLegendSwatch, { backgroundColor: item.color }]} />
          <ThemedText type="small" style={styles.chartLegendLabel} numberOfLines={1}>
            {item.label}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.chartLegendValue}>
            {total > 0 ? `${Math.round((item.amount / total) * 100)}%` : '0%'}
          </ThemedText>
        </View>
      ))}
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
  chartContent: {
    paddingBottom: BottomTabInset + 152,
    paddingHorizontal: Spacing.three,
  },
  chartsPanel: {
    gap: Spacing.three,
  },
  chartMetricGrid: {
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  chartMetric: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  chartMetricLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  chartMetricValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  chartCard: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  chartTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  balanceChartRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
  },
  balanceAxisLabels: {
    height: 174,
    justifyContent: 'space-between',
    width: 42,
  },
  balanceAxisLabel: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'right',
  },
  chartFrame: {
    alignItems: 'center',
    minHeight: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  chartFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  zeroLine: {
    borderTopWidth: 2,
    left: 0,
    opacity: 0.65,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  pieChartRow: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  chartLegend: {
    gap: Spacing.one,
    width: '100%',
  },
  chartLegendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 22,
  },
  chartLegendSwatch: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  chartLegendLabel: {
    flex: 1,
    minWidth: 0,
  },
  chartLegendValue: {
    minWidth: 42,
    textAlign: 'right',
  },
  topCategoryList: {
    gap: Spacing.three,
  },
  topCategoryItem: {
    gap: Spacing.one,
  },
  topCategoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  topCategoryLabelWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    minWidth: 0,
  },
  topCategoryLabel: {
    flex: 1,
    minWidth: 0,
  },
  topCategoryAmount: {
    flexShrink: 0,
    textAlign: 'right',
  },
  topCategoryTrack: {
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  topCategoryBar: {
    borderRadius: 6,
    height: '100%',
  },
  topCategoryPercent: {
    textAlign: 'right',
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
  summaryOpeningRow: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.half,
  },
  summaryDetail: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  summaryDetailAmount: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
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
