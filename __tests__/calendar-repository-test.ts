import {
  listCalendarEvents,
  validateCalendarEventInput,
} from "@/lib/calendar-repository";

describe("calendar repository", () => {
  test("normalizes text and accepts an optional positive amount", () => {
    expect(
      validateCalendarEventInput(
        {
          amount: 120000,
          eventDate: "2026-08-14",
          notes: "  utility bill  ",
          notificationTime: "09:30",
          recurrence: "one_time",
          title: "  Pay utilities  ",
        },
        new Date(2026, 7, 13),
      ),
    ).toMatchObject({
      amount: 120000,
      notes: "utility bill",
      title: "Pay utilities",
    });
  });

  test.each([
    ["empty title", { title: "", amount: null }, "emptyCalendarTitle"],
    ["zero amount", { title: "Taxes", amount: 0 }, "invalidCalendarAmount"],
  ])("rejects %s", (_label, overrides, code) => {
    expect(() =>
      validateCalendarEventInput({
        amount: overrides.amount,
        notificationTime: "08:00",
        notes: "",
        recurrence: "weekly",
        title: overrides.title,
        weekday: 2,
      }),
    ).toThrow(code);
  });

  test("rejects a past one-time event", () => {
    expect(() =>
      validateCalendarEventInput(
        {
          amount: null,
          eventDate: "2026-08-12",
          notes: "",
          notificationTime: "08:00",
          recurrence: "one_time",
          title: "Past",
        },
        new Date(2026, 7, 13),
      ),
    ).toThrow("pastCalendarEvent");
  });

  test("lists all events in descending creation order and maps rows", async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([
        {
          amount: null,
          created_at: "2026-08-13T10:00:00.000Z",
          day_of_month: null,
          event_date: null,
          id: 2,
          month_of_year: null,
          notes: null,
          notification_time: "08:00",
          recurrence: "weekly",
          title: "Taxes",
          updated_at: "2026-08-13T10:00:00.000Z",
          weekday: 2,
        },
      ]),
    };
    const events = await listCalendarEvents(db as never);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY created_at DESC, id DESC"),
    );
    expect(events[0]).toMatchObject({
      id: 2,
      notes: "",
      recurrence: "weekly",
      weekday: 2,
    });
  });
});
