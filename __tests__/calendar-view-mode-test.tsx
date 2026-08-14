import { act, renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  parseCalendarViewMode,
  useCalendarViewMode,
} from "@/hooks/use-calendar-view-mode";

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("calendar view preference", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
  });

  test("uses list for missing or invalid values", () => {
    expect(parseCalendarViewMode(null)).toBe("list");
    expect(parseCalendarViewMode("grid")).toBe("list");
  });

  test("restores a saved calendar view", async () => {
    storage.getItem.mockResolvedValue("calendar");
    const { result } = await renderHook(() => useCalendarViewMode());
    await waitFor(() => expect(result.current.viewMode).toBe("calendar"));
  });

  test("updates immediately and persists the selection", async () => {
    const { result } = await renderHook(() => useCalendarViewMode());
    await act(async () => result.current.setViewMode("calendar"));
    expect(result.current.viewMode).toBe("calendar");
    await waitFor(() =>
      expect(storage.setItem).toHaveBeenCalledWith(
        "cashio.calendar.view-mode.v1",
        "calendar",
      ),
    );
  });
});
