import { act, fireEvent, render, screen } from "@testing-library/react-native";

import {
  MonthChangeToast,
  MonthNavigation,
} from "@/components/month-navigation";

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/src/mock"),
);

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock("@/components/app-icon", () => ({
  AppIcon: () => null,
}));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    background: "#ffffff",
    backgroundElement: "#f0f0f3",
    backgroundSelected: "#e0e1e6",
    text: "#000000",
    textSecondary: "#60646c",
  }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { month?: string }) => {
      const translations: Record<string, string> = {
        "accessibility.nextMonth": "Next month",
        "accessibility.previousMonth": "Previous month",
        "dashboard.monthChanged": `Month changed to ${values?.month}.`,
      };

      return translations[key] ?? key;
    },
  }),
}));

describe("MonthNavigation", () => {
  test("renders the month and account context", async () => {
    await render(
      <MonthNavigation
        canGoNext
        canGoPrevious
        contextLabel="Primary"
        monthLabel="August 2026"
        onNextMonth={jest.fn()}
        onPreviousMonth={jest.fn()}
      />,
    );

    expect(screen.getByText("August 2026")).toBeOnTheScreen();
    expect(screen.getByText("Primary")).toBeOnTheScreen();
  });

  test("exposes the inverted controls with accessible labels", async () => {
    const onNextMonth = jest.fn();
    const onPreviousMonth = jest.fn();

    await render(
      <MonthNavigation
        canGoNext
        canGoPrevious
        contextLabel="Primary"
        monthLabel="July 2026"
        onNextMonth={onNextMonth}
        onPreviousMonth={onPreviousMonth}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Next month" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Previous month" }),
    );

    expect(onNextMonth).toHaveBeenCalledTimes(1);
    expect(onPreviousMonth).toHaveBeenCalledTimes(1);
  });

  test("does not invoke disabled month controls", async () => {
    const onNextMonth = jest.fn();
    const onPreviousMonth = jest.fn();

    await render(
      <MonthNavigation
        canGoNext={false}
        canGoPrevious={false}
        contextLabel="Primary"
        monthLabel="August 2026"
        onNextMonth={onNextMonth}
        onPreviousMonth={onPreviousMonth}
      />,
    );

    const nextButton = screen.getByLabelText("Next month");
    const previousButton = screen.getByLabelText("Previous month");

    expect(nextButton).toBeDisabled();
    expect(previousButton).toBeDisabled();

    await fireEvent.press(nextButton);
    await fireEvent.press(previousButton);

    expect(onNextMonth).not.toHaveBeenCalled();
    expect(onPreviousMonth).not.toHaveBeenCalled();
  });
});

describe("MonthChangeToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("does not announce the initial month", async () => {
    await render(
      <MonthChangeToast monthKey="2026-08" monthLabel="August 2026" />,
    );

    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  });

  test("announces a changed month and hides after two seconds", async () => {
    await render(
      <MonthChangeToast monthKey="2026-08" monthLabel="August 2026" />,
    );

    await screen.rerender(
      <MonthChangeToast monthKey="2026-07" monthLabel="July 2026" />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Month changed to July 2026.",
    );

    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(screen.getByRole("alert")).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  });

  test("restarts the timeout and shows the latest month", async () => {
    await render(
      <MonthChangeToast monthKey="2026-08" monthLabel="August 2026" />,
    );

    await screen.rerender(
      <MonthChangeToast monthKey="2026-07" monthLabel="July 2026" />,
    );

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await screen.rerender(
      <MonthChangeToast monthKey="2026-06" monthLabel="June 2026" />,
    );

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Month changed to June 2026.",
    );

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  });
});
