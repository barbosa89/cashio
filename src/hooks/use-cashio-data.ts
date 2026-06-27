import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  createCategory,
  createTag,
  createTransaction,
  copyPreviousMonthBudget,
  deleteCategory,
  deleteMonthlyBudgetAllocation,
  deleteTag,
  deleteTransactions,
  listCategories,
  listMonthlyBudgetProgress,
  listMonthlySummaries,
  listTags,
  listTransactions,
  upsertMonthlyBudgetAllocation,
  updateCategory,
  updateTag,
  type CreateTransactionInput,
  type SaveCategoryInput,
  type SaveMonthlyBudgetAllocationInput,
  type SaveTagInput,
} from '@/lib/cashio-repository';
import type { Category, MonthlyBudgetProgressRow, MonthlySummaryRow, Tag, Transaction } from '@/lib/database';

export function useCashioData() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudgetProgress, setMonthlyBudgetProgress] = useState<MonthlyBudgetProgressRow[]>([]);
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

  const refreshMonthlyBudgetProgress = useCallback(
    async (month: string) => {
      const nextMonthlyBudgetProgress = await listMonthlyBudgetProgress(db, month);
      setMonthlyBudgetProgress(nextMonthlyBudgetProgress);
      return nextMonthlyBudgetProgress;
    },
    [db]
  );

  const saveMonthlyBudgetAllocation = useCallback(
    async (input: SaveMonthlyBudgetAllocationInput) => {
      await upsertMonthlyBudgetAllocation(db, input);
      await refreshMonthlyBudgetProgress(input.month);
    },
    [db, refreshMonthlyBudgetProgress]
  );

  const removeMonthlyBudgetAllocation = useCallback(
    async (month: string, categoryId: number) => {
      await deleteMonthlyBudgetAllocation(db, month, categoryId);
      await refreshMonthlyBudgetProgress(month);
    },
    [db, refreshMonthlyBudgetProgress]
  );

  const copyBudgetFromPreviousMonth = useCallback(
    async (fromMonth: string, toMonth: string) => {
      const copiedCount = await copyPreviousMonthBudget(db, fromMonth, toMonth);
      await refreshMonthlyBudgetProgress(toMonth);
      return copiedCount;
    },
    [db, refreshMonthlyBudgetProgress]
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
    monthlyBudgetProgress,
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
    refreshMonthlyBudgetProgress,
    saveMonthlyBudgetAllocation,
    removeMonthlyBudgetAllocation,
    copyBudgetFromPreviousMonth,
    addTransaction,
    removeTransactions,
  };
}
