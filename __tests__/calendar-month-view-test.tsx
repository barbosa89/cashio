import { fireEvent, render, screen } from "@testing-library/react-native";
import { CalendarMonthView } from "@/components/calendar-month-view";
import type { CalendarEvent } from "@/lib/calendar-events";

jest.mock("@/components/app-icon", () => ({ AppIcon: () => null }));

jest.mock("@/components/calendar-event-card", () => ({
  CalendarEventCard: ({ event }: { event: { title: string } }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, event.title);
  },
}));

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ text: "#111111", textSecondary: "#666666" }),
}));

jest.mock("@/i18n/localization-provider", () => ({
  useLocalization: () => ({ languageTag: "en-US" }),
  useTranslation: () => ({
    t: (key: string, values?: { count?: number; date?: string }) => {
      const translations: Record<string, string> = {
        "accessibility.nextCalendarMonth": "Next calendar month",
        "accessibility.previousCalendarMonth": "Previous calendar month",
        "calendar.noEventsForDay": "There are no events for this day.",
      };
      if (key === "accessibility.calendarDay") {
        return `${values?.date}. Events: ${values?.count}`;
      }
      return translations[key] ?? key;
    },
  }),
}));

const event: CalendarEvent = {
  amount: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  eventDate: "2026-08-14",
  id: 1,
  notes: "",
  notificationTime: "08:00",
  recurrence: "one_time",
  title: "Pay taxes",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

const commonProps = {
  events: [event],
  notificationStatus: "scheduled" as const,
  onDelete: jest.fn(),
  onNextMonth: jest.fn(),
  onPreviousMonth: jest.fn(),
  onSelectDay: jest.fn(),
  visibleMonth: { month: 8, year: 2026 },
};

describe("CalendarMonthView", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders indicators and the selected day's agenda", async () => {
    await render(<CalendarMonthView {...commonProps} selectedDay={14} />);
    expect(screen.getByText("Pay taxes")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: /Friday, August 14, 2026\. Events: 1/,
      }).props.accessibilityState,
    ).toEqual({ selected: true });
  });

  test("selects days and navigates in conventional directions", async () => {
    await render(<CalendarMonthView {...commonProps} selectedDay={13} />);
    await fireEvent.press(
      screen.getByRole("button", { name: /Friday, August 14, 2026/ }),
    );
    expect(commonProps.onSelectDay).toHaveBeenCalledWith(14);
    await fireEvent.press(
      screen.getByRole("button", { name: "Previous calendar month" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Next calendar month" }),
    );
    expect(commonProps.onPreviousMonth).toHaveBeenCalledTimes(1);
    expect(commonProps.onNextMonth).toHaveBeenCalledTimes(1);
  });

  test("shows an empty agenda for a day without events", async () => {
    await render(<CalendarMonthView {...commonProps} selectedDay={13} />);
    expect(
      screen.getByText("There are no events for this day."),
    ).toBeOnTheScreen();
  });

  test("shows at most three dots instead of a numeric event count", async () => {
    const events = Array.from({ length: 4 }, (_, index) => ({
      ...event,
      id: index + 1,
      title: `Event ${index + 1}`,
    }));
    await render(
      <CalendarMonthView
        {...commonProps}
        events={events}
        selectedDay={14}
      />,
    );
    expect(
      screen.getAllByTestId(/calendar-event-dot-2026-08-14-/),
    ).toHaveLength(3);
    expect(
      screen.getByRole("button", {
        name: /Friday, August 14, 2026\. Events: 4/,
      }),
    ).toBeOnTheScreen();
  });
});
