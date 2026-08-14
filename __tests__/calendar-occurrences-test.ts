import {
  getCalendarOccurrencesForMonth,
  getLocaleFirstWeekday,
  moveCalendarMonth,
} from "@/lib/calendar-occurrences";
import type { CalendarEvent } from "@/lib/calendar-events";

const base = {
  amount: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  notes: "",
  title: "Event",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

describe("calendar month occurrences", () => {
  test("includes past one-time events and every weekly occurrence", () => {
    const events: CalendarEvent[] = [
      {
        ...base,
        eventDate: "2026-08-03",
        id: 1,
        notificationTime: "08:00",
        recurrence: "one_time",
      },
      {
        ...base,
        id: 2,
        notificationTime: "09:00",
        recurrence: "weekly",
        weekday: 2,
      },
    ];
    const occurrences = getCalendarOccurrencesForMonth(events, 2026, 8);
    expect(occurrences.filter((item) => item.event.id === 1)).toHaveLength(1);
    expect(
      occurrences
        .filter((item) => item.event.id === 2)
        .map((item) => item.date.getDate()),
    ).toEqual([3, 10, 17, 24, 31]);
  });

  test("expands twice-monthly and clamps day 31 to month end", () => {
    const events: CalendarEvent[] = [
      {
        ...base,
        id: 3,
        notificationTime: "12:00",
        recurrence: "semimonthly",
      },
      {
        ...base,
        dayOfMonth: 31,
        id: 4,
        notificationTime: "07:00",
        recurrence: "monthly",
      },
    ];
    const occurrences = getCalendarOccurrencesForMonth(events, 2026, 2);
    expect(occurrences.map((item) => item.date.getDate())).toEqual([1, 15, 28]);
  });

  test("adjusts February 29 yearly in non-leap years", () => {
    const event: CalendarEvent = {
      ...base,
      dayOfMonth: 29,
      id: 5,
      monthOfYear: 2,
      notificationTime: "08:30",
      recurrence: "yearly",
    };
    expect(getCalendarOccurrencesForMonth([event], 2026, 2)[0].date).toEqual(
      new Date(2026, 1, 28, 8, 30),
    );
    expect(getCalendarOccurrencesForMonth([event], 2028, 2)[0].date).toEqual(
      new Date(2028, 1, 29, 8, 30),
    );
  });

  test("sorts by time, then newest creation and id", () => {
    const events: CalendarEvent[] = [
      {
        ...base,
        createdAt: "2026-08-01T09:00:00.000Z",
        eventDate: "2026-08-14",
        id: 1,
        notificationTime: "10:00",
        recurrence: "one_time",
        title: "Later",
      },
      {
        ...base,
        createdAt: "2026-08-02T09:00:00.000Z",
        eventDate: "2026-08-14",
        id: 2,
        notificationTime: "08:00",
        recurrence: "one_time",
        title: "Newest",
      },
      {
        ...base,
        createdAt: "2026-08-01T09:00:00.000Z",
        eventDate: "2026-08-14",
        id: 3,
        notificationTime: "08:00",
        recurrence: "one_time",
        title: "Older",
      },
    ];
    expect(
      getCalendarOccurrencesForMonth(events, 2026, 8).map(
        (item) => item.event.title,
      ),
    ).toEqual(["Newest", "Older", "Later"]);
  });

  test("navigates across years and clamps the selected day", () => {
    expect(moveCalendarMonth({ month: 1, year: 2027 }, 31, -1)).toEqual({
      selectedDay: 31,
      visibleMonth: { month: 12, year: 2026 },
    });
    expect(moveCalendarMonth({ month: 1, year: 2028 }, 31, 1)).toEqual({
      selectedDay: 29,
      visibleMonth: { month: 2, year: 2028 },
    });
  });

  test("derives the first weekday from locale", () => {
    expect(getLocaleFirstWeekday("en-US")).toBe(0);
    expect(getLocaleFirstWeekday("en-GB")).toBe(1);
  });
});
