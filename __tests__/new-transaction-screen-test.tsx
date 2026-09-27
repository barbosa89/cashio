import { render, screen } from "@testing-library/react-native";

import NewTransactionScreen from "@/app/new-transaction";

let mockIsFocused = true;

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useIsFocused: () => mockIsFocused,
  useLocalSearchParams: () => ({}),
}));

jest.mock("@/components/transaction-editor-screen", () => {
  const { Text: MockText } = jest.requireActual("react-native");

  return {
    TransactionEditorScreen: () => <MockText>Transaction editor</MockText>,
  };
});

jest.mock("@/hooks/use-cashio-data", () => ({
  useCashioData: () => ({ getTransactionForEditing: jest.fn() }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("new transaction screen", () => {
  beforeEach(() => {
    mockIsFocused = true;
  });

  test("unmounts the editor while the route is unfocused", async () => {
    await render(<NewTransactionScreen />);
    expect(screen.getByText("Transaction editor")).toBeOnTheScreen();

    mockIsFocused = false;
    await screen.rerender(<NewTransactionScreen />);
    expect(screen.queryByText("Transaction editor")).not.toBeOnTheScreen();

    mockIsFocused = true;
    await screen.rerender(<NewTransactionScreen />);
    expect(screen.getByText("Transaction editor")).toBeOnTheScreen();
  });
});
