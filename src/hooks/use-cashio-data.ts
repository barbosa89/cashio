import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import {
  addMonthlyBudgetCategory,
  createAccount,
  createCategory,
  createTag,
  createTransaction,
  copyPreviousMonthBudget,
  deleteAccount,
  deleteCategory,
  deleteTag,
  deleteTransactions,
  getMonthlyBudgetData,
  listAccountBalances,
  listAccounts,
  listCategories,
  listMonthlySummaries,
  listTags,
  listTransactions,
  removeMonthlyBudgetCategory,
  updateAccount,
  updateMonthlyBudgetAmount,
  updateCategory,
  updateTag,
  type CreateTransactionInput,
  type SaveAccountInput,
  type SaveCategoryInput,
  type SaveMonthlyBudgetAmountInput,
  type SaveTagInput,
  type TransactionQueryFilters,
} from '@/lib/cashio-repository';
import type {
  Account,
  AccountBalanceRow,
  AccountScope,
  Category,
  MonthlyBudgetData,
  MonthlySummaryRow,
  Tag,
  Transaction,
} from '@/lib/database';

const EMPTY_MONTHLY_BUDGET_DATA: MonthlyBudgetData = {
  accountScope: 1,
  availableCategories: [],
  items: [],
  summary: {
    planned_total: 0,
    remaining_total: 0,
    spent_total: 0,
    unbudgeted_expense_total: 0,
  },
  unbudgetedExpenses: [],
};

export function useCashioData() {
  const db = useSQLiteContext();
  const [accountBalances, setAccountBalances] = useState<AccountBalanceRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudgetData, setMonthlyBudgetData] = useState<MonthlyBudgetData>(EMPTY_MONTHLY_BUDGET_DATA);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummaryRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const transactionQueryRequestId = useRef(0);

  const refresh = useCallback(async () => {
    const [nextAccounts, nextCategories, nextTags, nextTransactions, nextMonthlySummaries] = await Promise.all([
      listAccounts(db),
      listCategories(db),
      listTags(db),
      listTransactions(db),
      listMonthlySummaries(db),
    ]);

    setAccounts(nextAccounts);
    setCategories(nextCategories);
    setMonthlySummaries(nextMonthlySummaries);
    setTags(nextTags);
    setTransactions(nextTransactions);
    setIsLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const refreshAccountBalances = useCallback(
    async (month: string) => {
      const nextAccountBalances = await listAccountBalances(db, month);
      setAccountBalances(nextAccountBalances);
      return nextAccountBalances;
    },
    [db]
  );

  const refreshTransactions = useCallback(
    async (filters: TransactionQueryFilters = {}) => {
      const requestId = transactionQueryRequestId.current + 1;
      transactionQueryRequestId.current = requestId;
      const nextTransactions = await listTransactions(db, filters);
      if (transactionQueryRequestId.current === requestId) {
        setFilteredTransactions(nextTransactions);
      }
      return nextTransactions;
    },
    [db]
  );

  const addAccount = useCallback(
    async (input: SaveAccountInput) => {
      const account = await createAccount(db, input);
      await refresh();
      return account;
    },
    [db, refresh]
  );

  const editAccount = useCallback(
    async (id: number, input: SaveAccountInput) => {
      await updateAccount(db, id, input);
      await refresh();
    },
    [db, refresh]
  );

  const removeAccount = useCallback(
    async (id: number) => {
      await deleteAccount(db, id);
      await refresh();
    },
    [db, refresh]
  );

  const addCategory = useCallback(
    async (input: SaveCategoryInput) => {
      const category = await createCategory(db, input);
      await refresh();
      return category;
    },
    [db, refresh]
  );

  const editCategory = useCallback(
    async (id: number, input: SaveCategoryInput) => {
      await updateCategory(db, id, input);
      await refresh();
    },
    [db, refresh]
  );

  const removeCategory = useCallback(
    async (id: number) => {
      await deleteCategory(db, id);
      await refresh();
    },
    [db, refresh]
  );

  const addTag = useCallback(
    async (input: SaveTagInput) => {
      const tag = await createTag(db, input);
      await refresh();
      return tag;
    },
    [db, refresh]
  );

  const editTag = useCallback(
    async (id: number, input: SaveTagInput) => {
      await updateTag(db, id, input);
      await refresh();
    },
    [db, refresh]
  );

  const removeTag = useCallback(
    async (id: number) => {
      await deleteTag(db, id);
      await refresh();
    },
    [db, refresh]
  );

  const refreshMonthlyBudgetData = useCallback(
    async (accountScope: AccountScope, month: string) => {
      const nextMonthlyBudgetData = await getMonthlyBudgetData(db, accountScope, month);
      setMonthlyBudgetData(nextMonthlyBudgetData);
      return nextMonthlyBudgetData;
    },
    [db]
  );

  const addCategoryToMonthlyBudget = useCallback(
    async (accountScope: AccountScope, month: string, categoryId: number) => {
      await addMonthlyBudgetCategory(db, accountScope, month, categoryId);
      await refreshMonthlyBudgetData(accountScope, month);
    },
    [db, refreshMonthlyBudgetData]
  );

  const saveMonthlyBudgetAmount = useCallback(
    async (input: SaveMonthlyBudgetAmountInput) => {
      await updateMonthlyBudgetAmount(db, input);
      await refreshMonthlyBudgetData(input.accountScope, input.month);
    },
    [db, refreshMonthlyBudgetData]
  );

  const removeCategoryFromMonthlyBudget = useCallback(
    async (accountScope: AccountScope, month: string, categoryId: number) => {
      await removeMonthlyBudgetCategory(db, accountScope, month, categoryId);
      await refreshMonthlyBudgetData(accountScope, month);
    },
    [db, refreshMonthlyBudgetData]
  );

  const copyBudgetFromPreviousMonth = useCallback(
    async (accountScope: AccountScope, fromMonth: string, toMonth: string) => {
      const copiedCount = await copyPreviousMonthBudget(db, accountScope, fromMonth, toMonth);
      await refreshMonthlyBudgetData(accountScope, toMonth);
      return copiedCount;
    },
    [db, refreshMonthlyBudgetData]
  );

  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      await createTransaction(db, input);
      await refresh();
    },
    [db, refresh]
  );

  const removeTransactions = useCallback(
    async (ids: number[]) => {
      await deleteTransactions(db, ids);
      await refresh();
    },
    [db, refresh]
  );

  return {
    accountBalances,
    accounts,
    categories,
    filteredTransactions,
    monthlyBudgetData,
    monthlySummaries,
    tags,
    transactions,
    isLoading,
    refresh,
    refreshAccountBalances,
    refreshTransactions,
    addAccount,
    editAccount,
    removeAccount,
    addCategory,
    editCategory,
    removeCategory,
    addTag,
    editTag,
    removeTag,
    refreshMonthlyBudgetData,
    addCategoryToMonthlyBudget,
    saveMonthlyBudgetAmount,
    removeCategoryFromMonthlyBudget,
    copyBudgetFromPreviousMonth,
    addTransaction,
    removeTransactions,
  };
}
