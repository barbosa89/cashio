import {
  getNextCalendarOccurrence,
  type CalendarEventSchedule,
} from "@/lib/calendar-events";

function next(schedule: CalendarEventSchedule, after: Date) {
  return getNextCalendarOccurrence(schedule, after);
}

describe("getNextCalendarOccurrence", () => {
  test("returns a future one-time event and expires a past one", () => {
    const schedule = {
      eventDate: "2026-08-14",
      notificationTime: "09:30",
      recurrence: "one_time" as const,
    };
    expect(next(schedule, new Date(2026, 7, 13, 10))).toEqual(
      new Date(2026, 7, 14, 9, 30),
    );
    expect(next(schedule, new Date(2026, 7, 14, 9, 31))).toBeNull();
  });

  test("moves a weekly event to the following week after its time passes", () => {
    const schedule = {
      notificationTime: "08:00",
      recurrence: "weekly" as const,
      weekday: 2,
    };
    expect(next(schedule, new Date(2026, 7, 10, 7))).toEqual(
      new Date(2026, 7, 10, 8),
    );
    expect(next(schedule, new Date(2026, 7, 10, 9))).toEqual(
      new Date(2026, 7, 17, 8),
    );
  });

  test("uses the 1st and 15th for twice-monthly events", () => {
    const schedule = {
      notificationTime: "12:00",
      recurrence: "semimonthly" as const,
    };
    expect(next(schedule, new Date(2026, 7, 2))).toEqual(
      new Date(2026, 7, 15, 12),
    );
    expect(next(schedule, new Date(2026, 7, 16))).toEqual(
      new Date(2026, 8, 1, 12),
    );
  });

  test("clamps monthly events to the last day", () => {
    const schedule = {
      dayOfMonth: 31,
      notificationTime: "10:15",
      recurrence: "monthly" as const,
    };
    expect(next(schedule, new Date(2026, 1, 1))).toEqual(
      new Date(2026, 1, 28, 10, 15),
    );
    expect(next(schedule, new Date(2028, 1, 1))).toEqual(
      new Date(2028, 1, 29, 10, 15),
    );
  });

  test("clamps February 29 yearly and advances across years", () => {
    const schedule = {
      dayOfMonth: 29,
      monthOfYear: 2,
      notificationTime: "08:30",
      recurrence: "yearly" as const,
    };
    expect(next(schedule, new Date(2026, 0, 1))).toEqual(
      new Date(2026, 1, 28, 8, 30),
    );
    expect(next(schedule, new Date(2028, 2, 1))).toEqual(
      new Date(2029, 1, 28, 8, 30),
    );
  });
});
