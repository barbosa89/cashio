import { render, screen, userEvent } from "@testing-library/react-native";

import { TransactionForm } from "@/components/transaction-form";
import type { CreateTransactionInput } from "@/lib/cashio-repository";

const mockAddTransaction = jest.fn();
let mockAccounts = [
  { id: 1, is_default: 1, name: "Everyday" },
  { id: 2, is_default: 0, name: "Savings" },
];

const translations: Record<string, string> = {
  "common.expense": "Expense",
  "common.income": "Income",
  "common.saving": "Saving...",
  "common.tags": "Tags",
  "transaction.account": "Account",
  "transaction.amount": "Amount",
  "transaction.category": "Category",
  "transaction.date": "Date",
  "transaction.description": "Description",
  "transaction.destinationRequired": "Select a destination account to save this transfer.",
  "transaction.fromAccount": "From account",
  "transaction.saveChanges": "Save changes",
  "transaction.saveExpense": "Save expense",
  "transaction.saveIncome": "Save income",
  "transaction.saveTransfer": "Save transfer",
  "transaction.selectAccount": "Select account",
  "transaction.selectDestinationAccount": "Select destination account",
  "transaction.swap": "Swap",
  "transaction.swapAccounts": "Swap origin and destination accounts",
  "transaction.toAccount": "To account",
  "transaction.transfer": "Transfer",
  "transaction.transferNeedsTwoAccounts": "Add a second account to make transfers.",
};

jest.mock("@/components/app-icon", () => ({ AppIcon: () => null }));

jest.mock("@/hooks/use-cashio-data", () => ({
  useCashioData: () => ({
    accounts: mockAccounts,
    addCategory: jest.fn(),
    addTag: jest.fn(),
    addTransaction: mockAddTransaction,
    categories: [
      { id: 10, description: "General", type: "both" },
    ],
    isLoading: false,
    tags: [],
  }),
}));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    border: "#cccccc",
    danger: "#cc0000",
    onPrimary: "#111111",
    primary: "#f97316",
    primaryContainer: "#fff0e6",
    success: "#008855",
    surface: "#ffffff",
    surfaceMuted: "#f0f0ee",
    surfaceRaised: "#ffffff",
    text: "#111111",
    textSecondary: "#666666",
  }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useLocalization: () => ({ languageTag: "en-US" }),
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  DateTimePickerAndroid: { open: jest.fn() },
  default: () => null,
}));

jest.mock("react-native-currency-input", () => {
  const { TextInput } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: ({ onChangeValue, value, ...props }: {
      onChangeValue: (value: number | null) => void;
      value: number | null;
    }) => (
      <TextInput
        {...props}
        onChangeText={(text: string) => onChangeValue(text ? Number(text) : null)}
        value={value == null ? "" : String(value)}
      />
    ),
  };
});

jest.mock("react-native-dropdown-picker", () => {
  const { Pressable, Text, View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: ({
      items,
      open,
      placeholder,
      props,
      setOpen,
      setValue,
      value,
    }: {
      items: { label: string; value: number }[];
      open: boolean;
      placeholder: string;
      props?: { accessibilityLabel?: string };
      setOpen: (value: boolean) => void;
      setValue: (updater: (current: number | null) => number) => void;
      value: number | number[] | null;
    }) => {
      const selected = items.find((item) => item.value === value);

      return (
        <View>
          <Pressable
            accessibilityLabel={props?.accessibilityLabel}
            accessibilityRole="button"
            onPress={() => setOpen(!open)}
          >
            <Text>{selected?.label ?? placeholder}</Text>
          </Pressable>
          {open &&
            items.map((item) => (
              <Pressable
                accessibilityLabel={`${props?.accessibilityLabel}: ${item.label}`}
                accessibilityRole="button"
                key={item.value}
                onPress={() => {
                  setValue(() => item.value);
                  setOpen(false);
                }}
              >
                <Text>{item.label}</Text>
              </Pressable>
            ))}
        </View>
      );
    },
  };
});

const expenseValues: CreateTransactionInput = {
  accountId: 1,
  amount: 250,
  categoryId: 10,
  description: "Monthly savings",
  destinationAccountId: null,
  tagIds: [],
  transactionDate: "2026-09-28",
  type: "expense",
};

describe("transaction form transfer flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccounts = [
      { id: 1, is_default: 1, name: "Everyday" },
      { id: 2, is_default: 0, name: "Savings" },
    ];
  });

  test("creates a transfer and can swap its accounts", async () => {
    const user = userEvent.setup();
    await render(<TransactionForm initialValues={expenseValues} />);

    await user.press(screen.getByRole("radio", { name: "Transfer" }));
    expect(screen.getByRole("radio", { name: "Transfer" })).toBeChecked();

    await user.press(screen.getByRole("button", { name: "To account" }));
    await user.press(
      screen.getByRole("button", { name: "To account: Savings" }),
    );
    await user.press(
      screen.getByRole("button", {
        name: "Swap origin and destination accounts",
      }),
    );
    await user.press(screen.getByRole("button", { name: "Save transfer" }));

    expect(mockAddTransaction).toHaveBeenCalledWith({
      ...expenseValues,
      accountId: 2,
      destinationAccountId: 1,
      type: "expense",
    });
  });

  test("does not silently default an account for an unresolved draft", async () => {
    await render(
      <TransactionForm
        initialValues={{
          amount: 250,
          categoryId: 10,
          description: "Unresolved account",
          tagIds: [],
          transactionDate: "2026-09-28",
          type: "expense",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Account" })).toHaveTextContent(
      "Select account",
    );
  });

  test("clears the destination when changing a transfer to income", async () => {
    const user = userEvent.setup();
    await render(
      <TransactionForm
        initialValues={{ ...expenseValues, destinationAccountId: 2 }}
      />,
    );

    expect(screen.getByRole("radio", { name: "Transfer" })).toBeChecked();
    await user.press(screen.getByRole("radio", { name: "Income" }));
    await user.press(screen.getByRole("button", { name: "Save income" }));

    expect(mockAddTransaction).toHaveBeenCalledWith({
      ...expenseValues,
      destinationAccountId: null,
      type: "income",
    });
  });

  test("does not save a transfer without a destination", async () => {
    const user = userEvent.setup();
    await render(<TransactionForm initialValues={expenseValues} />);

    await user.press(screen.getByRole("radio", { name: "Transfer" }));
    await user.press(screen.getByRole("button", { name: "Save transfer" }));

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select a destination account to save this transfer.",
    );
  });

  test("preserves an unresolved voice transfer until a destination is selected", async () => {
    const user = userEvent.setup();
    await render(
      <TransactionForm
        initialValues={{
          ...expenseValues,
          destinationAccountId: null,
          transactionMode: "transfer",
        }}
      />,
    );

    expect(screen.getByRole("radio", { name: "Transfer" })).toBeChecked();
    await user.press(screen.getByRole("button", { name: "Save transfer" }));

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select a destination account to save this transfer.",
    );
  });

  test("disables transfers until a second account exists", async () => {
    mockAccounts = [{ id: 1, is_default: 1, name: "Everyday" }];

    await render(<TransactionForm initialValues={expenseValues} />);

    expect(screen.getByRole("radio", { name: "Transfer" })).toBeDisabled();
    expect(
      screen.getByText("Add a second account to make transfers."),
    ).toBeOnTheScreen();
  });
});
