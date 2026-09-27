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
  test("does not load the complete transaction history on focus", async () => {
    const { result } = await renderHook(() => useCashioData());

    await waitFor(() => {
      expect(result.current.dataRevision).toBe(1);
    });
    expect(listTransactions).not.toHaveBeenCalled();

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
  });
});
