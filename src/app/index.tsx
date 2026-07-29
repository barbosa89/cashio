import { router, useNavigation } from "expo-router";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useTranslation } from "@/i18n/localization-provider";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountBalancePanel } from "@/components/account-balance";
import { AccountSelector, getAccountScopeLabel } from "@/components/accounts";
import { AppIcon } from "@/components/app-icon";
import {
    BudgetSummaryCard,
    MonthlyBudgetPanel,
} from "@/components/monthly-budget";
import {
    CHART_CATEGORY_COLORS,
    MonthlyChartsPanel,
    formatMoney,
    type CategoryChartPoint,
} from "@/components/monthly-charts";
import { ReportExportPanel } from "@/components/report-export-panel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
    FilterSummaryBar,
    buildTransactionFilterSummary,
} from "@/components/transaction-filter-summary";
import {
    TransactionFilterSheet,
    type TransactionFilters,
} from "@/components/transaction-filters";
import { AppPalette, BottomTabInset, Spacing } from "@/constants/theme";
import { useCashioData } from "@/hooks/use-cashio-data";
import { useCashioSettings } from "@/hooks/use-cashio-settings";
import { useTheme } from "@/hooks/use-theme";
import {
  capitalizeLocalized,
  formatMonthYear,
} from "@/i18n/formatters";
import { useLocalization } from "@/i18n/localization-provider";
import type {
    Account,
    AccountScope,
    MonthlyBudgetItem,
    MonthlySummaryRow,
    Transaction,
} from "@/lib/database";

type VisibleMonth = {
  month: number;
  year: number;
};

type ActiveView = "list" | "charts" | "balance" | "budgets" | "reports";

type MonthlySummary = {
  balance: number;
  expense: number;
  income: number;
  openingBalance: number;
  openingBalanceLabel: string;
  transferIn: number;
  transferOut: number;
};

const MONTH_SWIPE_THRESHOLD = 72;
const FILTER_SUMMARY_GAP = Spacing.two;
const FILTER_SUMMARY_ESTIMATED_HEIGHT = 102;
const BOTTOM_BAR_ESTIMATED_HEIGHT = 72;

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
  const month = String(visibleMonth.month).padStart(2, "0");

  return `${visibleMonth.year}-${month}-`;
}

function formatMonthKey(visibleMonth: VisibleMonth) {
  return formatMonthPrefix(visibleMonth).slice(0, 7);
}

function formatMonthLabel(visibleMonth: VisibleMonth, locale: string) {
  return capitalizeLocalized(
    formatMonthYear(visibleMonth.year, visibleMonth.month, locale),
    locale,
  );
}

function groupByCategory(
  monthTransactions: Transaction[],
  type: Transaction["type"],
): CategoryChartPoint[] {
  const totals = new Map<string, number>();

  for (const transaction of monthTransactions) {
    if (transaction.type !== type || transaction.is_transfer === 1) {
      continue;
    }

    totals.set(
      transaction.category_description,
      (totals.get(transaction.category_description) ?? 0) + transaction.amount,
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

function accountMatchesScope(
  transaction: Transaction,
  accountScope: AccountScope,
) {
  return accountScope === "all" || transaction.account_id === accountScope;
}

function aggregateMonthlySummaries(
  monthlySummaries: MonthlySummaryRow[],
  accountScope: AccountScope,
): MonthlySummaryRow[] {
  const totalsByMonth = new Map<string, MonthlySummaryRow>();

  for (const monthlySummary of monthlySummaries) {
    if (accountScope !== "all" && monthlySummary.account_id !== accountScope) {
      continue;
    }

    const current = totalsByMonth.get(monthlySummary.month);
    if (!current) {
      totalsByMonth.set(monthlySummary.month, {
        ...monthlySummary,
        account_id: accountScope === "all" ? 0 : monthlySummary.account_id,
      });
      continue;
    }

    current.income_total += monthlySummary.income_total;
    current.expense_total += monthlySummary.expense_total;
    current.transfer_in_total += monthlySummary.transfer_in_total;
    current.transfer_out_total += monthlySummary.transfer_out_total;
    current.net_total += monthlySummary.net_total;
    current.transaction_count += monthlySummary.transaction_count;
  }

  return [...totalsByMonth.values()].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
}

function getInitialBalanceForScope(
  accounts: Account[],
  accountScope: AccountScope,
) {
  if (accountScope === "all") {
    return accounts.reduce(
      (total, account) => total + account.initial_balance,
      0,
    );
  }

  return (
    accounts.find((account) => account.id === accountScope)?.initial_balance ??
    0
  );
}

function getAccountIdForNewTransaction(
  accounts: Account[],
  accountScope: AccountScope,
) {
  if (accountScope === "all") {
    return (
      accounts.find((account) => account.is_default === 1)?.id ??
      accounts[0]?.id ??
      null
    );
  }

  return accountScope;
}

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const { t } = useTranslation();
  const { languageTag } = useLocalization();
  const {
    accountBalances,
    accounts,
    categories,
    addCategoryToMonthlyBudget,
    copyBudgetFromPreviousMonth,
    filteredTransactions: queriedTransactions,
    isLoading,
    monthlyBudgetData,
    monthlySummaries,
    refreshAccountBalances,
    refreshMonthlyBudgetData,
    refreshTransactions,
    removeCategoryFromMonthlyBudget,
    removeTransactions,
    saveMonthlyBudgetAmount,
    tags,
    transactions,
  } = useCashioData();
  const { settings } = useCashioSettings();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [filters, setFilters] = useState<TransactionFilters>({
    categoryId: null,
    tagId: null,
  });
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    number[]
  >([]);
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() =>
    getCurrentMonth(),
  );
  const [activeView, setActiveView] = useState<ActiveView>("list");
  const [selectedAccountScope, setSelectedAccountScope] =
    useState<AccountScope>(1);
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);
  const [inlineMessage, setInlineMessage] = useState("");
  const [budgetMessage, setBudgetMessage] = useState("");
  const autoCopiedBudgetKeys = useRef(new Set<string>());
  const visibleMonthPrefix = formatMonthPrefix(visibleMonth);
  const visibleMonthKey = formatMonthKey(visibleMonth);
  const visibleMonthLabel = formatMonthLabel(visibleMonth, languageTag);
  const shouldAccumulatePreviousBalances = settings.accumulatePreviousBalances;
  const shouldAutoCopyPreviousMonthBudget =
    settings.autoCopyPreviousMonthBudget;
  const selectedTransactionIdSet = useMemo(
    () => new Set(selectedTransactionIds),
    [selectedTransactionIds],
  );
  const selectedTransactionCount = selectedTransactionIds.length;
  const isSelectionMode = selectedTransactionCount > 0;
  const selectedAccountLabel = getAccountScopeLabel(
    accounts,
    selectedAccountScope,
    t("common.allFeminine"),
    t("seeds.primaryAccount"),
  );

  const visibleMonthlySummaries = useMemo(
    () => aggregateMonthlySummaries(monthlySummaries, selectedAccountScope),
    [monthlySummaries, selectedAccountScope],
  );

  const selectedCategory = useMemo(
    () =>
      categories.find((category) => category.id === filters.categoryId) ?? null,
    [categories, filters.categoryId],
  );

  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === filters.tagId) ?? null,
    [filters.tagId, tags],
  );

  const accountScopedTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        accountMatchesScope(transaction, selectedAccountScope),
      ),
    [selectedAccountScope, transactions],
  );

  const visibleMonthTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.transaction_date.startsWith(visibleMonthPrefix) &&
          accountMatchesScope(transaction, selectedAccountScope),
      ),
    [selectedAccountScope, transactions, visibleMonthPrefix],
  );

  const filteredTransactions = queriedTransactions;

  const visibleMonthSummary = useMemo(
    () =>
      visibleMonthlySummaries.find(
        (monthlySummary) => monthlySummary.month === visibleMonthKey,
      ) ?? null,
    [visibleMonthlySummaries, visibleMonthKey],
  );

  const initialBalance = useMemo(
    () => getInitialBalanceForScope(accounts, selectedAccountScope),
    [accounts, selectedAccountScope],
  );

  const previousBalance = useMemo(() => {
    if (!shouldAccumulatePreviousBalances) {
      return 0;
    }

    return visibleMonthlySummaries.reduce(
      (total, monthlySummary) =>
        monthlySummary.month < visibleMonthKey
          ? total + monthlySummary.net_total
          : total,
      0,
    );
  }, [
    shouldAccumulatePreviousBalances,
    visibleMonthKey,
    visibleMonthlySummaries,
  ]);

  const filteredSummary = useMemo(
    () => buildTransactionFilterSummary(filteredTransactions),
    [filteredTransactions],
  );

  const summary = useMemo<MonthlySummary>(() => {
    const income = visibleMonthSummary?.income_total ?? 0;
    const expense = visibleMonthSummary?.expense_total ?? 0;
    const net = visibleMonthSummary?.net_total ?? 0;
    const transferIn = visibleMonthSummary?.transfer_in_total ?? 0;
    const transferOut = visibleMonthSummary?.transfer_out_total ?? 0;

    return {
      balance: initialBalance + previousBalance + net,
      expense,
      income,
      openingBalance: initialBalance + previousBalance,
      openingBalanceLabel: shouldAccumulatePreviousBalances
        ? t("reports.previousBalance")
        : t("balance.openingBalance"),
      transferIn,
      transferOut,
    };
  }, [
    initialBalance,
    previousBalance,
    shouldAccumulatePreviousBalances,
    t,
    visibleMonthSummary,
  ]);

  const expenseCategoryData = useMemo(
    () => groupByCategory(visibleMonthTransactions, "expense"),
    [visibleMonthTransactions],
  );

  const budgetSummary = monthlyBudgetData.summary;

  const hasActiveFilters =
    !!descriptionSearch.trim() || !!selectedCategory || !!selectedTag;
  const shouldShowFilterSummary =
    activeView === "list" && hasActiveFilters && !isSelectionMode;
  const accountIdForNewTransaction = getAccountIdForNewTransaction(
    accounts,
    selectedAccountScope,
  );

  useEffect(() => {
    if (selectedAccountScope === "all") {
      return;
    }

    if (accounts.some((account) => account.id === selectedAccountScope)) {
      return;
    }

    const defaultAccountId =
      accounts.find((account) => account.is_default === 1)?.id ??
      accounts[0]?.id;
    if (defaultAccountId) {
      setSelectedAccountScope(defaultAccountId);
    }
  }, [accounts, selectedAccountScope]);

  useEffect(() => {
    void refreshTransactions({
      accountScope: selectedAccountScope,
      categoryId: selectedCategory?.id ?? null,
      descriptionSearch,
      month: visibleMonthKey,
      tagId: selectedTag?.id ?? null,
    });
  }, [
    descriptionSearch,
    refreshTransactions,
    selectedAccountScope,
    selectedCategory,
    selectedTag,
    transactions,
    visibleMonthKey,
  ]);

  useEffect(() => {
    void refreshMonthlyBudgetData(selectedAccountScope, visibleMonthKey);
  }, [
    categories,
    refreshMonthlyBudgetData,
    selectedAccountScope,
    transactions,
    visibleMonthKey,
  ]);

  useEffect(() => {
    if (!shouldAutoCopyPreviousMonthBudget || activeView !== "budgets") {
      return;
    }

    if (typeof selectedAccountScope !== "number") {
      return;
    }

    const autoCopyKey = `${selectedAccountScope}:${visibleMonthKey}`;
    if (autoCopiedBudgetKeys.current.has(autoCopyKey)) {
      return;
    }

    autoCopiedBudgetKeys.current.add(autoCopyKey);

    async function autoCopyPreviousBudget() {
      setBudgetMessage("");

      try {
        const previousMonthKey = formatMonthKey(addMonths(visibleMonth, -1));
        const copiedCount = await copyBudgetFromPreviousMonth(
          selectedAccountScope,
          previousMonthKey,
          visibleMonthKey,
        );

        if (copiedCount > 0) {
          setBudgetMessage(t("budget.updatedFromPrevious"));
        }
      } catch {
        setBudgetMessage(t("budget.copyFailed"));
      }
    }

    void autoCopyPreviousBudget();
  }, [
    activeView,
    copyBudgetFromPreviousMonth,
    selectedAccountScope,
    shouldAutoCopyPreviousMonthBudget,
    t,
    visibleMonth,
    visibleMonthKey,
  ]);

  useEffect(() => {
    void refreshAccountBalances(visibleMonthKey);
  }, [accounts, monthlySummaries, refreshAccountBalances, visibleMonthKey]);

  function cancelSelection() {
    setSelectedTransactionIds([]);
  }

  function selectTransaction(id: number) {
    setSelectedTransactionIds((currentIds) =>
      currentIds.includes(id) ? currentIds : [...currentIds, id],
    );
  }

  function toggleTransactionSelection(id: number) {
    setSelectedTransactionIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  }

  async function deleteSelectedTransactions(ids: number[]) {
    setInlineMessage("");

    try {
      await removeTransactions(ids);
      setSelectedTransactionIds([]);
    } catch {
      setInlineMessage(t("dashboard.deleteFailed"));
    }
  }

  function handleDeleteSelectedTransactions() {
    const ids = [...selectedTransactionIds];
    const count = ids.length;
    const message = t("dashboard.deleteSelected", { count });

    if (count === 0) {
      return;
    }

    if (Platform.OS === "web") {
      if (confirm(message)) {
        void deleteSelectedTransactions(ids);
      }
      return;
    }

    Alert.alert(t("dashboard.deleteTitle"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void deleteSelectedTransactions(ids);
        },
      },
    ]);
  }

  function handleListPress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setActiveView("list");
  }

  function handleChartsPress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setActiveView("charts");
  }

  function handleBalancePress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setActiveView("balance");
  }

  function handleBudgetsPress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setBudgetMessage("");
    setActiveView("budgets");
  }

  function handleReportsPress() {
    if (isSelectionMode) {
      cancelSelection();
      return;
    }

    setActiveView("reports");
  }

  async function handleAddBudgetCategory(categoryId: number) {
    setBudgetMessage("");

    try {
      await addCategoryToMonthlyBudget(
        selectedAccountScope,
        visibleMonthKey,
        categoryId,
      );
    } catch {
      setBudgetMessage(t("budget.addFailed"));
    }
  }

  async function handleSaveBudgetAmount(
    categoryId: number,
    plannedAmount: number,
  ) {
    setBudgetMessage("");

    try {
      await saveMonthlyBudgetAmount({
        accountScope: selectedAccountScope,
        categoryId,
        month: visibleMonthKey,
        plannedAmount,
      });
    } catch {
      setBudgetMessage(t("budget.saveFailed"));
    }
  }

  async function removeBudgetCategory(categoryId: number) {
    setBudgetMessage("");

    try {
      await removeCategoryFromMonthlyBudget(
        selectedAccountScope,
        visibleMonthKey,
        categoryId,
      );
    } catch {
      setBudgetMessage(t("budget.removeFailed"));
    }
  }

  function handleRemoveBudgetCategory(item: MonthlyBudgetItem) {
    const confirmMessage =
      item.spent_amount > 0
        ? t("budget.removeWithExpenses")
        : t("budget.removePrompt");

    if (Platform.OS === "web") {
      if (confirm(confirmMessage)) {
        void removeBudgetCategory(item.category_id);
      }
      return;
    }

    Alert.alert(t("budget.removeTitle"), confirmMessage, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          void removeBudgetCategory(item.category_id);
        },
      },
    ]);
  }

  async function handleCopyPreviousBudget() {
    setBudgetMessage("");

    try {
      const previousMonthKey = formatMonthKey(addMonths(visibleMonth, -1));
      const copiedCount = await copyBudgetFromPreviousMonth(
        selectedAccountScope,
        previousMonthKey,
        visibleMonthKey,
      );
      setBudgetMessage(
        copiedCount > 0
          ? t("budget.copied")
          : t("budget.nothingToCopy"),
      );
    } catch {
      setBudgetMessage(t("budget.copyFailed"));
    }
  }

  const goToPreviousMonth = useCallback(() => {
    setVisibleMonth((currentVisibleMonth) =>
      addMonths(currentVisibleMonth, -1),
    );
  }, []);

  const goToNextMonth = useCallback(() => {
    setVisibleMonth((currentVisibleMonth) => {
      const nextMonth = addMonths(currentVisibleMonth, 1);

      return compareMonths(nextMonth, getCurrentMonth()) <= 0
        ? nextMonth
        : currentVisibleMonth;
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
    [goToNextMonth, goToPreviousMonth],
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
    [handleMonthSwipe, isSelectionMode],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          style={[
            styles.phoneSurface,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          {isSelectionMode ? (
            <SelectionHeader
              count={selectedTransactionCount}
              onCancel={cancelSelection}
              onDelete={handleDeleteSelectedTransactions}
            />
          ) : activeView === "balance" ? (
            <ThemedView style={styles.header}>
              <IconButton
                label={t("accessibility.openMenu")}
                onPress={() => navigation.openDrawer()}
              >
                <AppIcon color={theme.text} name="menu" size={30} />
              </IconButton>
              <ThemedText type="smallBold" style={styles.reportHeaderTitle}>
                {t("dashboard.balanceTitle")}
              </ThemedText>
              <View style={styles.headerSpacer} />
            </ThemedView>
          ) : activeView === "reports" || activeView === "budgets" ? (
            <ThemedView style={styles.header}>
              <IconButton
                label={t("accessibility.openMenu")}
                onPress={() => navigation.openDrawer()}
              >
                <AppIcon color={theme.text} name="menu" size={30} />
              </IconButton>
              <ThemedText type="smallBold" style={styles.reportHeaderTitle}>
                {activeView === "budgets"
                  ? `${t("dashboard.budget")} · ${selectedAccountLabel}`
                  : `${t("dashboard.reports")} · ${selectedAccountLabel}`}
              </ThemedText>
              <IconButton
                label={t("dashboard.selectAccount")}
                selected={selectedAccountScope !== 1}
                onPress={() => setIsAccountSelectorOpen(true)}
              >
                <AppIcon color={theme.text} name="bank" size={30} />
              </IconButton>
            </ThemedView>
          ) : (
            <ThemedView style={styles.header}>
              <IconButton
                label={t("accessibility.openMenu")}
                onPress={() => navigation.openDrawer()}
              >
                <AppIcon color={theme.text} name="menu" size={30} />
              </IconButton>

              <View style={styles.headerActions}>
                <ThemedView type="backgroundSelected" style={styles.searchWrap}>
                  <TextInput
                    accessibilityLabel={t("accessibility.searchTransactions")}
                    onChangeText={setDescriptionSearch}
                    placeholder={t("dashboard.search")}
                    placeholderTextColor={theme.text}
                    style={[styles.searchInput, { color: theme.text }]}
                    value={descriptionSearch}
                  />
                </ThemedView>
                <IconButton
                  label={t("dashboard.filter")}
                  selected={hasActiveFilters}
                  onPress={() => setIsFilterOpen(true)}
                >
                  <AppIcon color={theme.text} name="filter" size={30} />
                </IconButton>
                <IconButton
                  label={t("dashboard.selectAccount")}
                  selected={selectedAccountScope !== 1}
                  onPress={() => setIsAccountSelectorOpen(true)}
                >
                  <AppIcon color={theme.text} name="bank" size={30} />
                </IconButton>
              </View>
            </ThemedView>
          )}

          {activeView === "budgets" ? (
            <>
              <BudgetSummaryCard
                monthLabel={visibleMonthLabel}
                summary={budgetSummary}
              />
              <AccountScopeHint label={selectedAccountLabel} />
            </>
          ) : (
            activeView !== "reports" &&
            activeView !== "balance" && (
              <BalanceSummary
                accountLabel={selectedAccountLabel}
                balance={summary.balance}
                expense={summary.expense}
                income={summary.income}
                monthLabel={visibleMonthLabel}
                openingBalance={summary.openingBalance}
                openingBalanceLabel={summary.openingBalanceLabel}
                showTransfers={selectedAccountScope !== "all"}
                transferIn={summary.transferIn}
                transferOut={summary.transferOut}
              />
            )
          )}

          {activeView === "reports" ? (
            <ScrollView
              contentContainerStyle={styles.reportContent}
              style={styles.list}
            >
              <ReportExportPanel
                defaultMonth={visibleMonthKey}
                initialBalance={initialBalance}
                isLoading={isLoading}
                monthlySummaries={visibleMonthlySummaries}
                transactions={accountScopedTransactions}
              />
            </ScrollView>
          ) : (
            <GestureDetector gesture={monthSwipeGesture}>
              {activeView === "list" ? (
                <ScrollView
                  contentContainerStyle={[
                    styles.listContent,
                    shouldShowFilterSummary &&
                      styles.listContentWithFilterSummary,
                  ]}
                  style={styles.list}
                >
                  {filteredTransactions.length === 0 ? (
                    <ThemedView style={styles.emptyState}>
                      <ThemedText type="subtitle" style={styles.emptyTitle}>
                        {t("dashboard.emptyTitle")}
                      </ThemedText>
                      <ThemedText
                        themeColor="textSecondary"
                        style={styles.emptyText}
                      >
                        {t("dashboard.noTransactions")}
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
                        showAccountName={selectedAccountScope === "all"}
                        transaction={transaction}
                      />
                    ))
                  )}
                </ScrollView>
              ) : activeView === "charts" ? (
                <ScrollView
                  contentContainerStyle={styles.chartContent}
                  style={styles.list}
                >
                  <MonthlyChartsPanel
                    expenseCategoryData={expenseCategoryData}
                    monthlySummaries={visibleMonthlySummaries}
                    summary={summary}
                    visibleYear={visibleMonth.year}
                  />
                </ScrollView>
              ) : activeView === "balance" ? (
                <ScrollView
                  contentContainerStyle={styles.balanceContent}
                  style={styles.list}
                >
                  <AccountBalancePanel
                    monthLabel={visibleMonthLabel}
                    rows={accountBalances}
                  />
                </ScrollView>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.budgetContent}
                  style={styles.list}
                >
                  <MonthlyBudgetPanel
                    autoCopyPreviousMonthBudget={
                      shouldAutoCopyPreviousMonthBudget
                    }
                    budgetData={monthlyBudgetData}
                    budgetMessage={budgetMessage}
                    onAddCategory={(categoryId) =>
                      void handleAddBudgetCategory(categoryId)
                    }
                    onCopyPreviousBudget={() => void handleCopyPreviousBudget()}
                    onRemoveCategory={handleRemoveBudgetCategory}
                    onSaveAmount={(categoryId, plannedAmount) =>
                      void handleSaveBudgetAmount(categoryId, plannedAmount)
                    }
                    readOnly={selectedAccountScope === "all"}
                  />
                </ScrollView>
              )}
            </GestureDetector>
          )}

          {activeView !== "reports" &&
            activeView !== "budgets" &&
            activeView !== "balance" &&
            !!inlineMessage && (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.inlineMessage}
              >
                {inlineMessage}
              </ThemedText>
            )}

          {shouldShowFilterSummary && (
            <FilterSummaryBar summary={filteredSummary} />
          )}

          {!isSelectionMode &&
            activeView !== "reports" &&
            activeView !== "budgets" &&
            activeView !== "balance" && (
              <Pressable
                accessibilityLabel={t("accessibility.addTransaction")}
                onPress={() => {
                  if (!accountIdForNewTransaction) {
                    router.push("/new-transaction");
                    return;
                  }

                  router.push({
                    pathname: "/new-transaction",
                    params: {
                      accountId: String(accountIdForNewTransaction),
                    },
                  });
                }}
                style={({ pressed }) => [
                  styles.fab,
                  shouldShowFilterSummary && styles.fabWithFilterSummary,
                  pressed && styles.fabPressed,
                ]}
              >
                <AppIcon
                  color={AppPalette.foregroundInverse}
                  name="plus"
                  size={36}
                />
              </Pressable>
            )}

          <ThemedView
            style={[
              styles.bottomBar,
              { borderTopColor: theme.backgroundSelected },
            ]}
          >
            <IconButton
              label={t("dashboard.list")}
              selected={activeView === "list"}
              onPress={handleListPress}
            >
              <AppIcon color={theme.text} name="list" size={34} />
            </IconButton>
            <IconButton
              label={t("dashboard.charts")}
              selected={activeView === "charts"}
              onPress={handleChartsPress}
            >
              <AppIcon color={theme.text} name="bar-chart-2" size={34} />
            </IconButton>
            <IconButton
              label={t("dashboard.balance")}
              selected={activeView === "balance"}
              onPress={handleBalancePress}
            >
              <AppIcon color={theme.text} name="columns" size={34} />
            </IconButton>
            <IconButton
              label={t("dashboard.budget")}
              selected={activeView === "budgets"}
              onPress={handleBudgetsPress}
            >
              <AppIcon color={theme.text} name="target" size={34} />
            </IconButton>
            <IconButton
              label={t("dashboard.reports")}
              selected={activeView === "reports"}
              onPress={handleReportsPress}
            >
              <AppIcon color={theme.text} name="file-text" size={34} />
            </IconButton>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>

      <TransactionFilterSheet
        categories={categories}
        filters={filters}
        isVisible={isFilterOpen}
        onApply={setFilters}
        onClose={() => setIsFilterOpen(false)}
        tags={tags}
      />
      <AccountSelector
        accounts={accounts}
        isVisible={isAccountSelectorOpen}
        onClose={() => setIsAccountSelectorOpen(false)}
        onSelect={(accountScope) => {
          cancelSelection();
          setBudgetMessage("");
          setSelectedAccountScope(accountScope);
        }}
        selectedAccountScope={selectedAccountScope}
      />
    </ThemedView>
  );
}

function TransactionRow({
  onLongPress,
  onPress,
  selected,
  selectionMode,
  showAccountName,
  transaction,
}: {
  onLongPress: () => void;
  onPress: () => void;
  selected: boolean;
  selectionMode: boolean;
  showAccountName: boolean;
  transaction: Transaction;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { languageTag } = useLocalization();
  const transferAccount =
    transaction.transfer_peer_account_name ?? t("dashboard.otherAccount");

  return (
    <Pressable
      accessibilityHint={
        selectionMode
          ? t("accessibility.tapSelection")
          : t("accessibility.holdSelection")
      }
      accessibilityLabel={t("accessibility.transaction", {
        name:
          transaction.description || transaction.category_description,
      })}
      accessibilityState={{ selected }}
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={selected ? "backgroundSelected" : "background"}
        style={styles.transactionRow}
      >
        <TypeIcon
          color={theme.text}
          selected={selected}
          type={transaction.type}
        />
        <View style={styles.transactionBody}>
          <ThemedText type="subtitle" style={styles.amount}>
            {formatMoney(transaction.amount, languageTag)}
          </ThemedText>
          <View style={styles.metadataRow}>
            <AppIcon
              color={theme.textSecondary}
              name="folder"
              size={12}
              style={styles.metadataIcon}
            />
            <ThemedText type="small" style={styles.metadataText}>
              {transaction.category_description}
            </ThemedText>
          </View>
          {showAccountName && (
            <View style={styles.metadataRow}>
              <AppIcon
                color={theme.textSecondary}
                name="bank"
                size={12}
                style={styles.metadataIcon}
              />
              <ThemedText type="small" style={styles.metadataText}>
                {transaction.account_name}
              </ThemedText>
            </View>
          )}
          {transaction.is_transfer === 1 && (
            <View style={styles.metadataRow}>
              <AppIcon
                color={theme.textSecondary}
                name="repeat"
                size={12}
                style={styles.metadataIcon}
              />
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.metadataText}
              >
                {t(
                  transaction.type === "expense"
                    ? "dashboard.transferTo"
                    : "dashboard.transferFrom",
                  { account: transferAccount },
                )}
              </ThemedText>
            </View>
          )}
          {!!transaction.description && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.description}
            >
              {transaction.description}
            </ThemedText>
          )}
          {!!transaction.tags && (
            <View style={styles.metadataRow}>
              <AppIcon
                color={theme.textSecondary}
                name="tag"
                size={12}
                style={styles.metadataIcon}
              />
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={[styles.description, styles.metadataText]}
              >
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
  const { t } = useTranslation();
  const label = t("dashboard.selectedCount", { count });

  return (
    <ThemedView type="backgroundSelected" style={styles.selectionHeader}>
      <FlatIconButton
        label={t("dashboard.cancelDeletion")}
        onPress={onCancel}
      >
        <AppIcon color={theme.text} name="arrow-left" size={28} />
      </FlatIconButton>
      <ThemedText type="smallBold" style={styles.selectionTitle}>
        {label}
      </ThemedText>
      <FlatIconButton
        label={t("dashboard.deleteSelection")}
        onPress={onDelete}
      >
        <AppIcon color={theme.text} name="trash-2" size={28} />
      </FlatIconButton>
    </ThemedView>
  );
}

function BalanceSummary({
  accountLabel,
  balance,
  expense,
  income,
  monthLabel,
  openingBalance,
  openingBalanceLabel,
  showTransfers,
  transferIn,
  transferOut,
}: {
  accountLabel: string;
  balance: number;
  expense: number;
  income: number;
  monthLabel: string;
  openingBalance: number;
  openingBalanceLabel: string;
  showTransfers: boolean;
  transferIn: number;
  transferOut: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { languageTag } = useLocalization();
  const hasTransfers = showTransfers && (transferIn > 0 || transferOut > 0);

  return (
    <View style={styles.summaryWrap}>
      <ThemedText type="smallBold" style={styles.summaryMonth}>
        {monthLabel}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.summaryAccount}
      >
        {accountLabel}
      </ThemedText>
      <ThemedView type="backgroundSelected" style={styles.summaryPanel}>
        <View style={styles.summaryMainRow}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            {t("dashboard.balance")}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.summaryAmount}>
            $ {formatMoney(balance, languageTag)}
          </ThemedText>
        </View>
        <View
          style={[
            styles.summaryOpeningRow,
            { borderTopColor: theme.textSecondary },
          ]}
        >
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            {openingBalanceLabel}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.summaryDetailAmount}>
            $ {formatMoney(openingBalance, languageTag)}
          </ThemedText>
        </View>
        <View style={styles.summaryDetailRow}>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            {t("balance.income")}: $ {formatMoney(income, languageTag)}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.summaryDetail}>
            {t("balance.expenses")}: $ {formatMoney(expense, languageTag)}
          </ThemedText>
        </View>
        {hasTransfers && transferIn > 0 && (
          <View style={styles.summaryDetailRow}>
            <ThemedText type="smallBold" style={styles.summaryDetail}>
              {t("balance.incomingTransfers")}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.summaryDetailAmount}>
              $ {formatMoney(transferIn, languageTag)}
            </ThemedText>
          </View>
        )}
        {hasTransfers && transferOut > 0 && (
          <View style={styles.summaryDetailRow}>
            <ThemedText type="smallBold" style={styles.summaryDetail}>
              {t("balance.outgoingTransfers")}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.summaryDetailAmount}>
              $ {formatMoney(transferOut, languageTag)}
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </View>
  );
}

function AccountScopeHint({ label }: { label: string }) {
  return (
    <ThemedText
      type="small"
      themeColor="textSecondary"
      style={styles.accountHint}
    >
      {label}
    </ThemedText>
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
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={selected ? "backgroundSelected" : "background"}
        style={styles.iconButton}
      >
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
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.flatIconButton,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

function TypeIcon({
  color,
  selected,
  type,
}: {
  color: string;
  selected?: boolean;
  type: Transaction["type"];
}) {
  const iconColor = type === "income" ? AppPalette.incomeGreen : color;
  const iconName = selected
    ? "check"
    : type === "income"
      ? "arrow-up"
      : "arrow-down";

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
    alignItems: "center",
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === "web" ? Spacing.three : 0,
  },
  phoneSurface: {
    borderWidth: Platform.OS === "web" ? 1 : 0,
    flex: 1,
    maxWidth: 430,
    position: "relative",
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    paddingTop: Spacing.four,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "space-between",
    minWidth: 0,
  },
  reportHeaderTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
  },
  headerSpacer: {
    height: 48,
    width: 48,
  },
  selectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  selectionTitle: {
    flex: 1,
    textAlign: "center",
  },
  searchWrap: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flex: 1,
    height: 38,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 0,
    paddingVertical: 0,
    textAlign: "center",
    width: "100%",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  flatIconButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
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
  listContentWithFilterSummary: {
    paddingBottom: BottomTabInset + 216,
  },
  chartContent: {
    paddingBottom: BottomTabInset + 152,
    paddingHorizontal: Spacing.three,
  },
  budgetContent: {
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  balanceContent: {
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  reportContent: {
    paddingBottom: BottomTabInset + Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  transactionRow: {
    alignItems: "flex-start",
    borderRadius: Spacing.two,
    flexDirection: "row",
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
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  metadataText: {
    flexShrink: 1,
  },
  dateText: {
    minWidth: 96,
    textAlign: "right",
  },
  typeIcon: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
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
    textAlign: "center",
  },
  summaryAccount: {
    textAlign: "center",
  },
  accountHint: {
    marginTop: Spacing.one,
    textAlign: "center",
  },
  summaryPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  summaryMainRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  summaryAmount: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: "right",
  },
  summaryDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  summaryOpeningRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
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
    textAlign: "right",
  },
  bottomBar: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: BottomTabInset + Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  fab: {
    alignItems: "center",
    backgroundColor: AppPalette.brandOrange,
    borderColor: "transparent",
    borderRadius: Spacing.two,
    borderWidth: 2,
    bottom: BottomTabInset + 104,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.three,
    width: 64,
    zIndex: 2,
  },
  fabPressed: {
    backgroundColor: AppPalette.brandOrangeActive,
  },
  fabWithFilterSummary: {
    bottom:
      BottomTabInset +
      BOTTOM_BAR_ESTIMATED_HEIGHT +
      FILTER_SUMMARY_ESTIMATED_HEIGHT +
      FILTER_SUMMARY_GAP * 2,
  },
  inlineMessage: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 360,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  emptyText: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
