import { render, screen } from "@testing-library/react-native";

import { BalanceSummary } from "@/components/balance-summary";

jest.mock("@/components/app-icon", () => ({ AppIcon: () => null }));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    border: "#cccccc",
    danger: "#cc0000",
    success: "#008800",
    surfaceMuted: "#eeeeee",
    text: "#111111",
    textSecondary: "#666666",
  }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useLocalization: () => ({ languageTag: "en-US" }),
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "balance.expenses": "Expenses",
        "balance.income": "Income",
        "balance.incomingTransfers": "Incoming transfers",
        "balance.outgoingTransfers": "Outgoing transfers",
        "dashboard.balance": "Balance",
      };

      return translations[key] ?? key;
    },
  }),
}));

const summaryProps = {
  balance: 498_015,
  expense: 1_805,
  income: 500_000,
  openingBalance: 0,
  openingBalanceLabel: "Previous balance",
  showTransfers: true,
  transferIn: 20,
  transferOut: 200,
} as const;

describe("BalanceSummary", () => {
  test("keeps every balance component visible in the compact variant", async () => {
    await render(<BalanceSummary {...summaryProps} variant="compact" />);

    expect(screen.getByText("Balance")).toBeOnTheScreen();
    expect(screen.getByText("$ 498,015")).toBeOnTheScreen();
    expect(screen.getByText("Previous balance")).toBeOnTheScreen();
    expect(screen.getByText("$ 500,000")).toBeOnTheScreen();
    expect(screen.getByText("$ 1,805")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Incoming transfers: $ 20"),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Outgoing transfers: $ 200"),
    ).toBeOnTheScreen();
  });

  test("omits transfer details when they are outside the selected scope", async () => {
    await render(
      <BalanceSummary
        {...summaryProps}
        showTransfers={false}
        variant="compact"
      />,
    );

    expect(
      screen.queryByLabelText("Incoming transfers: $ 20"),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Outgoing transfers: $ 200"),
    ).not.toBeOnTheScreen();
  });
});
