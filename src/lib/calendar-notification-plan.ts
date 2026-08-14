import {
  daysInMonth,
  parseLocalDateTime,
  type CalendarEvent,
} from "@/lib/calendar-events";

export type CalendarNotificationTrigger =
  | { date: Date; kind: "date" }
  | { day: number; hour: number; kind: "monthly"; minute: number }
  | { hour: number; kind: "weekly"; minute: number; weekday: number }
  | {
      day: number;
      hour: number;
      kind: "yearly";
      minute: number;
      monthIndex: number;
    };

export type CalendarNotificationDefinition = {
  body: string;
  eventId: number;
  identifier: string;
  title: string;
  trigger: CalendarNotificationTrigger;
};

export const CALENDAR_NOTIFICATION_PREFIX = "cashio-calendar-";

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function eventFingerprint(event: CalendarEvent) {
  return stableHash(
    JSON.stringify({
      amount: event.amount,
      dayOfMonth: "dayOfMonth" in event ? event.dayOfMonth : null,
      eventDate: "eventDate" in event ? event.eventDate : null,
      monthOfYear: "monthOfYear" in event ? event.monthOfYear : null,
      notes: event.notes,
      notificationTime: event.notificationTime,
      recurrence: event.recurrence,
      title: event.title,
      weekday: "weekday" in event ? event.weekday : null,
    }),
  );
}

function definition(
  event: CalendarEvent,
  slot: string,
  trigger: CalendarNotificationTrigger,
): CalendarNotificationDefinition {
  return {
    body: event.notes || "Cash IO",
    eventId: event.id,
    identifier: `${CALENDAR_NOTIFICATION_PREFIX}${event.id}-${eventFingerprint(event)}-${slot}`,
    title: event.title,
    trigger,
  };
}

function exceptionDatesForMonthlyEvent(
  event: Extract<CalendarEvent, { recurrence: "monthly" }>,
  now: Date,
) {
  const dates: { date: Date; slot: string }[] = [];
  const [hour, minute] = event.notificationTime.split(":").map(Number);
  const horizon = new Date(now);
  horizon.setFullYear(horizon.getFullYear() + 4);

  for (let offset = 0; offset <= 48; offset += 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = monthStart.getFullYear();
    const monthIndex = monthStart.getMonth();
    const lastDay = daysInMonth(year, monthIndex + 1);
    if (event.dayOfMonth <= lastDay) {
      continue;
    }
    const date = new Date(year, monthIndex, lastDay, hour, minute, 0, 0);
    if (date.getTime() > now.getTime() && date.getTime() <= horizon.getTime()) {
      dates.push({
        date,
        slot: `month-end-${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      });
    }
  }
  return dates;
}

export function buildCalendarNotificationPlan(
  events: CalendarEvent[],
  now = new Date(),
) {
  const definitions: CalendarNotificationDefinition[] = [];

  for (const event of events) {
    const [hour, minute] = event.notificationTime.split(":").map(Number);
    switch (event.recurrence) {
      case "one_time": {
        const date = parseLocalDateTime(event.eventDate, event.notificationTime);
        if (date && date.getTime() > now.getTime()) {
          definitions.push(definition(event, "once", { date, kind: "date" }));
        }
        break;
      }
      case "weekly":
        definitions.push(
          definition(event, "weekly", {
            hour,
            kind: "weekly",
            minute,
            weekday: event.weekday,
          }),
        );
        break;
      case "semimonthly":
        definitions.push(
          definition(event, "day-1", { day: 1, hour, kind: "monthly", minute }),
          definition(event, "day-15", { day: 15, hour, kind: "monthly", minute }),
        );
        break;
      case "monthly":
        definitions.push(
          definition(event, "monthly", {
            day: event.dayOfMonth,
            hour,
            kind: "monthly",
            minute,
          }),
          ...exceptionDatesForMonthlyEvent(event, now).map(({ date, slot }) =>
            definition(event, slot, { date, kind: "date" }),
          ),
        );
        break;
      case "yearly":
        definitions.push(
          definition(event, "yearly", {
            day: event.dayOfMonth,
            hour,
            kind: "yearly",
            minute,
            monthIndex: event.monthOfYear - 1,
          }),
        );
        if (event.monthOfYear === 2 && event.dayOfMonth === 29) {
          const horizon = new Date(now);
          horizon.setFullYear(horizon.getFullYear() + 4);
          for (let year = now.getFullYear(); year <= now.getFullYear() + 4; year += 1) {
            if (daysInMonth(year, 2) === 29) {
              continue;
            }
            const date = new Date(year, 1, 28, hour, minute, 0, 0);
            if (
              date.getTime() > now.getTime() &&
              date.getTime() <= horizon.getTime()
            ) {
              definitions.push(
                definition(event, `feb-end-${year}`, { date, kind: "date" }),
              );
            }
          }
        }
        break;
    }
  }

  return definitions;
}
