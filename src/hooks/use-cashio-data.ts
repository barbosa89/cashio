import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  addMonthlyBudgetCategory,
  createCategory,
  createTag,
  createTransaction,
  copyPreviousMonthBudget,
  deleteCategory,
  deleteTag,
  deleteTransactions,
  getMonthlyBudgetData,
  listCategories,
  listMonthlySummaries,
  listTags,
  listTransactions,
  removeMonthlyBudgetCategory,
  updateMonthlyBudgetAmount,
  updateCategory,
  updateTag,
  type CreateTransactionInput,
  type SaveCategoryInput,
  type SaveMonthlyBudgetAmountInput,
  type SaveTagInput,
} from '@/lib/cashio-repository';
import type { Category, MonthlyBudgetData, MonthlySummaryRow, Tag, Transaction } from '@/lib/database';

const EMPTY_MONTHLY_BUDGET_DATA: MonthlyBudgetData = {
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudgetData, setMonthlyBudgetData] = useState<MonthlyBudgetData>(EMPTY_MONTHLY_BUDGET_DATA);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummaryRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextCategories, nextTags, nextTransactions, nextMonthlySummaries] = await Promise.all([
      listCategories(db),
      listTags(db),
      listTransactions(db),
      listMonthlySummaries(db),
    ]);

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
    async (month: string) => {
      const nextMonthlyBudgetData = await getMonthlyBudgetData(db, month);
      setMonthlyBudgetData(nextMonthlyBudgetData);
      return nextMonthlyBudgetData;
    },
    [db]
  );

  const addCategoryToMonthlyBudget = useCallback(
    async (month: string, categoryId: number) => {
      await addMonthlyBudgetCategory(db, month, categoryId);
      await refreshMonthlyBudgetData(month);
    },
    [db, refreshMonthlyBudgetData]
  );

  const saveMonthlyBudgetAmount = useCallback(
    async (input: SaveMonthlyBudgetAmountInput) => {
      await updateMonthlyBudgetAmount(db, input);
      await refreshMonthlyBudgetData(input.month);
    },
    [db, refreshMonthlyBudgetData]
  );

  const removeCategoryFromMonthlyBudget = useCallback(
    async (month: string, categoryId: number) => {
      await removeMonthlyBudgetCategory(db, month, categoryId);
      await refreshMonthlyBudgetData(month);
    },
    [db, refreshMonthlyBudgetData]
  );

  const copyBudgetFromPreviousMonth = useCallback(
    async (fromMonth: string, toMonth: string) => {
      const copiedCount = await copyPreviousMonthBudget(db, fromMonth, toMonth);
      await refreshMonthlyBudgetData(toMonth);
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
    categories,
    monthlyBudgetData,
    monthlySummaries,
    tags,
    transactions,
    isLoading,
    refresh,
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
