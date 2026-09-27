import { act, render, screen } from "@testing-library/react-native";

import { TransactionListSkeleton } from "@/components/transaction-list-skeleton";

let mockReducedMotion = false;

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock"),
);

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return {
    ...Reanimated,
    useReducedMotion: () => mockReducedMotion,
  };
});

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    border: "#cccccc",
    surfaceMuted: "#eeeeee",
  }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "common.loading" ? "Loading" : key),
  }),
}));

describe("TransactionListSkeleton", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion = false;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("waits before exposing the loading state", async () => {
    await render(<TransactionListSkeleton />);

    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();

    await act(() => {
      jest.advanceTimersByTime(179);
    });
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();

    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(
      screen.getByRole("progressbar", { name: "Loading" }),
    ).toBeOnTheScreen();
  });

  test("does not announce loading when it unmounts before the delay", async () => {
    function Harness({ visible }: { visible: boolean }) {
      return visible ? <TransactionListSkeleton /> : null;
    }

    await render(<Harness visible />);
    await act(() => {
      jest.advanceTimersByTime(100);
    });
    await screen.rerender(<Harness visible={false} />);
    await act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  });
});
