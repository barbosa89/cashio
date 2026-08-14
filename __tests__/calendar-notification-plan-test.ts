import { buildCalendarNotificationPlan } from "@/lib/calendar-notification-plan";
import type { CalendarEvent } from "@/lib/calendar-events";

const base = {
  amount: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  id: 10,
  notes: "",
  title: "Pay taxes",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("buildCalendarNotificationPlan", () => {
  test("builds two native monthly triggers for twice-monthly events", () => {
    const event: CalendarEvent = {
      ...base,
      notificationTime: "08:00",
      recurrence: "semimonthly",
    };
    const plan = buildCalendarNotificationPlan([event], new Date(2026, 0, 10));
    expect(plan.map((item) => item.trigger)).toEqual([
      { day: 1, hour: 8, kind: "monthly", minute: 0 },
      { day: 15, hour: 8, kind: "monthly", minute: 0 },
    ]);
  });

  test("adds exact month-end exceptions for day 31", () => {
    const event: CalendarEvent = {
      ...base,
      dayOfMonth: 31,
      notificationTime: "09:45",
      recurrence: "monthly",
    };
    const plan = buildCalendarNotificationPlan([event], new Date(2026, 0, 10));
    expect(plan[0].trigger).toEqual({
      day: 31,
      hour: 9,
      kind: "monthly",
      minute: 45,
    });
    expect(
      plan.some(
        (item) =>
          item.trigger.kind === "date" &&
          item.trigger.date.getTime() === new Date(2026, 1, 28, 9, 45).getTime(),
      ),
    ).toBe(true);
  });

  test("adds non-leap February exceptions for a yearly February 29 event", () => {
    const event: CalendarEvent = {
      ...base,
      dayOfMonth: 29,
      monthOfYear: 2,
      notificationTime: "07:00",
      recurrence: "yearly",
    };
    const plan = buildCalendarNotificationPlan([event], new Date(2026, 0, 1));
    expect(
      plan.some(
        (item) =>
          item.trigger.kind === "date" &&
          item.trigger.date.getTime() === new Date(2026, 1, 28, 7).getTime(),
      ),
    ).toBe(true);
    expect(
      plan.some(
        (item) =>
          item.trigger.kind === "date" &&
          item.trigger.date.getFullYear() === 2028,
      ),
    ).toBe(false);
  });

  test("uses stable IDs and changes the fingerprint when content changes", () => {
    const event: CalendarEvent = {
      ...base,
      notificationTime: "08:00",
      recurrence: "weekly",
      weekday: 2,
    };
    const first = buildCalendarNotificationPlan([event])[0].identifier;
    const second = buildCalendarNotificationPlan([event])[0].identifier;
    const changed = buildCalendarNotificationPlan([
      { ...event, title: "Declare taxes" },
    ])[0].identifier;
    expect(first).toBe(second);
    expect(changed).not.toBe(first);
  });
});
