import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import {
  EditCalendarEventEditor,
  NewCalendarEventEditor,
} from "@/components/calendar-event-editor";
import type { CalendarEvent } from "@/lib/calendar-events";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
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

jest.mock("@/lib/calendar-notifications", () => ({
  openExactAlarmSettings: jest.fn(),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useLocalization: () => ({ languageTag: "en-US" }),
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "calendar.amount": "Amount",
        "calendar.create": "Create event",
        "calendar.date": "Date",
        "calendar.dayOfMonth": "Day of month",
        "calendar.editTitle": "Edit event",
        "calendar.eventTitle": "Title",
        "calendar.eventTitlePlaceholder": "Event title",
        "calendar.monthEndDescription": "Uses the last day",
        "calendar.newTitle": "New event",
        "calendar.notes": "Notes",
        "calendar.notesPlaceholder": "Event notes",
        "calendar.recurrence": "Periodicity",
        "calendar.recurrences.monthly": "Monthly",
        "calendar.recurrences.one_time": "One time",
        "calendar.save": "Save changes",
        "calendar.time": "Notification time",
        "common.optional": "Optional",
        "common.saving": "Saving...",
      };
      return translations[key] ?? key;
    },
  }),
}));

const router = jest.requireMock("expo-router") as {
  router: { replace: jest.Mock };
};
const mockUseCalendarEvents = (
  jest.requireMock("@/hooks/use-calendar-events") as { useCalendarEvents: jest.Mock }
).useCalendarEvents;
const mockAddEvent = jest.fn();
const mockEditEvent = jest.fn();

describe("calendar event editor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddEvent.mockResolvedValue({
      event: { id: 1 },
      offerExactAlarmSettings: false,
    });
    mockEditEvent.mockResolvedValue(undefined);
    mockUseCalendarEvents.mockReturnValue({
      addEvent: mockAddEvent,
      editEvent: mockEditEvent,
    });
  });

  test("shows fields for the selected recurrence variant", async () => {
    await render(<NewCalendarEventEditor />);
    await fireEvent.press(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getByText("Day of month")).toBeOnTheScreen();
    expect(screen.getByText("Uses the last day")).toBeOnTheScreen();
  });

  test("creates an event and returns to the calendar", async () => {
    await render(<NewCalendarEventEditor />);
    await fireEvent.changeText(screen.getByPlaceholderText("Event title"), "Pay utilities");
    await fireEvent.changeText(screen.getByPlaceholderText("Event notes"), "Before Friday");
    await fireEvent.press(screen.getByRole("button", { name: "Create event" }));

    await waitFor(() =>
      expect(mockAddEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "Before Friday",
          recurrence: "one_time",
          title: "Pay utilities",
        }),
      ),
    );
    expect(router.router.replace).toHaveBeenCalledWith("/calendar");
  });

  test("edits an existing event through the shared form", async () => {
    const event: CalendarEvent = {
      amount: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      eventDate: "2099-01-02",
      id: 9,
      notes: "Original",
      notificationTime: "09:00",
      recurrence: "one_time",
      title: "Taxes",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await render(<EditCalendarEventEditor event={event} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Event title"), "Declare taxes");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(mockEditEvent).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ title: "Declare taxes" }),
      ),
    );
  });
});
