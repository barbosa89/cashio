import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useCashioData } from "@/hooks/use-cashio-data";
import { listTransactions } from "@/lib/cashio-repository";

const mockDb = {};

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require("react");
    useEffect(callback, [callback]);
  },
}));

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: () => mockDb,
}));

jest.mock("@/lib/cashio-repository", () => ({
  listAccountBalances: jest.fn().mockResolvedValue([]),
  listAccounts: jest.fn().mockResolvedValue([]),
  listCategories: jest.fn().mockResolvedValue([]),
  listMonthlySummaries: jest.fn().mockResolvedValue([]),
  listTags: jest.fn().mockResolvedValue([]),
  listTransactions: jest.fn().mockResolvedValue([]),
}));

describe("useCashioData transaction loading", () => {
  beforeEach(() => {
    jest.mocked(listTransactions).mockReset().mockResolvedValue([]);
  });

  test("does not load the complete transaction history on focus", async () => {
    const { result } = await renderHook(() => useCashioData());

    await waitFor(() => {
      expect(result.current.dataRevision).toBe(1);
    });
    expect(listTransactions).not.toHaveBeenCalled();
    expect(result.current.hasLoadedTransactions).toBe(false);

    await act(async () => {
      await result.current.refreshTransactions({
        accountScope: 1,
        month: "2026-09",
      });
    });

    expect(listTransactions).toHaveBeenCalledTimes(1);
    expect(listTransactions).toHaveBeenCalledWith(mockDb, {
      accountScope: 1,
      month: "2026-09",
      monthRange: undefined,
    });
    expect(result.current.hasLoadedTransactions).toBe(true);
  });

  test("keeps the previous transactions while a refresh is pending", async () => {
    const transaction = { id: 17 } as never;
    jest.mocked(listTransactions).mockResolvedValueOnce([transaction]);
    const { result } = await renderHook(() => useCashioData());

    await waitFor(() => {
      expect(result.current.dataRevision).toBe(1);
    });
    await act(async () => {
      await result.current.refreshTransactions({ accountScope: 1, month: "2026-09" });
    });

    let resolveRefresh: (transactions: never[]) => void = () => undefined;
    const pendingRefresh = new Promise<never[]>((resolve) => {
      resolveRefresh = resolve;
    });
    jest.mocked(listTransactions).mockReturnValueOnce(pendingRefresh);

    let refreshPromise: Promise<unknown> | undefined;
    await act(async () => {
      refreshPromise = result.current.refreshTransactions({
        accountScope: 1,
        month: "2026-10",
      });
      await Promise.resolve();
    });

    expect(result.current.isTransactionsLoading).toBe(true);
    expect(result.current.transactions).toEqual([transaction]);

    await act(async () => {
      resolveRefresh([]);
      await refreshPromise;
    });

    expect(result.current.isTransactionsLoading).toBe(false);
    expect(result.current.transactions).toEqual([]);
  });
});
