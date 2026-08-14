import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import { CalendarIndex } from "@/components/calendar-index";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useNavigation: () => ({ openDrawer: jest.fn() }),
}));

jest.mock("@/components/app-icon", () => ({ AppIcon: () => null }));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    backgroundSelected: "#eeeeee",
    text: "#111111",
    textSecondary: "#666666",
  }),
}));

jest.mock("@/hooks/use-calendar-events", () => ({
  useCalendarEvents: jest.fn(),
}));

const mockPush = (jest.requireMock("expo-router") as { router: { push: jest.Mock } }).router.push;
const mockUseCalendarEvents = (
  jest.requireMock("@/hooks/use-calendar-events") as { useCalendarEvents: jest.Mock }
).useCalendarEvents;
const mockRemoveEvent = jest.fn();

jest.mock("@/lib/calendar-notifications", () => ({
  openCalendarNotificationSettings: jest.fn(),
  openExactAlarmSettings: jest.fn(),
  requestCalendarNotificationPermission: jest.fn(),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useLocalization: () => ({ languageTag: "en-US" }),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "accessibility.addCalendarEvent": "Add calendar event",
        "accessibility.openMenu": "Open menu",
        "calendar.empty": "There are no financial events.",
        "calendar.mobileOnly": "Mobile only",
        "calendar.notificationActive": "Notification active",
        "calendar.webNotice": "Web notice",
        "navigation.calendar": "Calendar",
      };
      if (key === "accessibility.editNamed") return `Edit ${values?.name}`;
      if (key === "accessibility.deleteNamed") return `Delete ${values?.name}`;
      return translations[key] ?? key;
    },
  }),
}));

describe("CalendarIndex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCalendarEvents.mockReturnValue({
      events: [],
      isLoading: false,
      notificationStatus: "web",
      refresh: jest.fn(),
      removeEvent: mockRemoveEvent,
    });
  });

  test("renders the empty state and opens the creation route from the FAB", async () => {
    await render(<CalendarIndex />);
    expect(screen.getByText("There are no financial events.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Add calendar event" }));
    expect(mockPush).toHaveBeenCalledWith("/calendar/new");
  });

  test("renders event edit and delete actions with accessible names", async () => {
    mockUseCalendarEvents.mockReturnValue({
      events: [
        {
          amount: 100,
          createdAt: "2026-08-13T10:00:00.000Z",
          id: 7,
          notes: "Before Friday",
          notificationTime: "08:00",
          recurrence: "weekly",
          title: "Pay credit",
          updatedAt: "2026-08-13T10:00:00.000Z",
          weekday: 6,
        },
      ],
      isLoading: false,
      notificationStatus: "scheduled",
      refresh: jest.fn(),
      removeEvent: mockRemoveEvent,
    });
    await render(<CalendarIndex />);
    expect(screen.getByText("Pay credit")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Edit Pay credit" }));
    expect(mockPush).toHaveBeenCalledWith({
      params: { id: "7" },
      pathname: "/calendar/[id]/edit",
    });
    expect(screen.getByRole("button", { name: "Delete Pay credit" })).toBeOnTheScreen();
    expect(screen.getByText("Notification active")).toBeOnTheScreen();
  });

  test("confirms before deleting an event", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    mockUseCalendarEvents.mockReturnValue({
      events: [
        {
          amount: null,
          createdAt: "2026-08-13T10:00:00.000Z",
          id: 8,
          notes: "",
          notificationTime: "08:00",
          recurrence: "weekly",
          title: "Declare taxes",
          updatedAt: "2026-08-13T10:00:00.000Z",
          weekday: 2,
        },
      ],
      isLoading: false,
      notificationStatus: "scheduled",
      refresh: jest.fn(),
      removeEvent: mockRemoveEvent,
    });
    await render(<CalendarIndex />);
    await fireEvent.press(screen.getByRole("button", { name: "Delete Declare taxes" }));
    expect(alert).toHaveBeenCalled();
    expect(mockRemoveEvent).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2];
    const destructiveAction = buttons?.find((button) => button.style === "destructive");
    await act(async () => {
      await destructiveAction?.onPress?.();
    });
    expect(mockRemoveEvent).toHaveBeenCalledWith(8);
    alert.mockRestore();
  });
});
