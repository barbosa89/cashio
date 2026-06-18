import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import {
  createCategory,
  createTag,
  createTransaction,
  deleteCategory,
  deleteTag,
  deleteTransactions,
  listCategories,
  listMonthlySummaries,
  listTags,
  listTransactions,
  updateCategory,
  updateTag,
  type CreateTransactionInput,
  type SaveCategoryInput,
  type SaveTagInput,
} from '@/lib/cashio-repository';
import type { Category, MonthlySummaryRow, Tag, Transaction } from '@/lib/database';

export function useCashioData() {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
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
    addTransaction,
    removeTransactions,
  };
}
