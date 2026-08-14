export const CALENDAR_RECURRENCES = [
  "one_time",
  "weekly",
  "semimonthly",
  "monthly",
  "yearly",
] as const;

export type CalendarRecurrence = (typeof CALENDAR_RECURRENCES)[number];

export type CalendarEventContent = {
  amount: number | null;
  notes: string;
  title: string;
};

export type CalendarEventSchedule =
  | {
      eventDate: string;
      notificationTime: string;
      recurrence: "one_time";
    }
  | {
      notificationTime: string;
      recurrence: "weekly";
      weekday: number;
    }
  | {
      notificationTime: string;
      recurrence: "semimonthly";
    }
  | {
      dayOfMonth: number;
      notificationTime: string;
      recurrence: "monthly";
    }
  | {
      dayOfMonth: number;
      monthOfYear: number;
      notificationTime: string;
      recurrence: "yearly";
    };

export type SaveCalendarEventInput = CalendarEventContent & CalendarEventSchedule;

export type CalendarEvent = CalendarEventContent &
  CalendarEventSchedule & {
    createdAt: string;
    id: number;
    updatedAt: string;
  };

export type CalendarEventRow = {
  amount: number | null;
  created_at: string;
  day_of_month: number | null;
  event_date: string | null;
  id: number;
  month_of_year: number | null;
  notes: string | null;
  notification_time: string;
  recurrence: CalendarRecurrence;
  title: string;
  updated_at: string;
  weekday: number | null;
};

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLocalTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function parseLocalDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function daysInMonth(year: number, monthOfYear: number) {
  return new Date(year, monthOfYear, 0).getDate();
}

function atLocalTime(year: number, monthIndex: number, day: number, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

function nextMonthlyOccurrence(
  dayOfMonth: number,
  time: string,
  after: Date,
) {
  for (let offset = 0; offset <= 12; offset += 1) {
    const monthStart = new Date(after.getFullYear(), after.getMonth() + offset, 1);
    const year = monthStart.getFullYear();
    const monthIndex = monthStart.getMonth();
    const day = Math.min(dayOfMonth, daysInMonth(year, monthIndex + 1));
    const candidate = atLocalTime(year, monthIndex, day, time);
    if (candidate.getTime() > after.getTime()) {
      return candidate;
    }
  }
  return null;
}

export function getNextCalendarOccurrence(
  event: CalendarEventSchedule,
  after = new Date(),
): Date | null {
  switch (event.recurrence) {
    case "one_time": {
      const candidate = parseLocalDateTime(event.eventDate, event.notificationTime);
      return candidate && candidate.getTime() > after.getTime() ? candidate : null;
    }
    case "weekly": {
      const [hour, minute] = event.notificationTime.split(":").map(Number);
      const targetWeekday = event.weekday - 1;
      const daysAhead = (targetWeekday - after.getDay() + 7) % 7;
      const candidate = new Date(
        after.getFullYear(),
        after.getMonth(),
        after.getDate() + daysAhead,
        hour,
        minute,
        0,
        0,
      );
      if (candidate.getTime() <= after.getTime()) {
        candidate.setDate(candidate.getDate() + 7);
      }
      return candidate;
    }
    case "semimonthly": {
      const candidates = [1, 15]
        .map((day) => atLocalTime(after.getFullYear(), after.getMonth(), day, event.notificationTime))
        .filter((date) => date.getTime() > after.getTime());
      return candidates[0] ?? nextMonthlyOccurrence(1, event.notificationTime, after);
    }
    case "monthly":
      return nextMonthlyOccurrence(event.dayOfMonth, event.notificationTime, after);
    case "yearly": {
      for (let year = after.getFullYear(); year <= after.getFullYear() + 2; year += 1) {
        const day = Math.min(
          event.dayOfMonth,
          daysInMonth(year, event.monthOfYear),
        );
        const candidate = atLocalTime(
          year,
          event.monthOfYear - 1,
          day,
          event.notificationTime,
        );
        if (candidate.getTime() > after.getTime()) {
          return candidate;
        }
      }
      return null;
    }
  }
}

export function calendarEventFromRow(row: CalendarEventRow): CalendarEvent {
  const content = {
    amount: row.amount,
    createdAt: row.created_at,
    id: row.id,
    notes: row.notes ?? "",
    title: row.title,
    updatedAt: row.updated_at,
  };

  switch (row.recurrence) {
    case "one_time":
      return {
        ...content,
        eventDate: row.event_date ?? "",
        notificationTime: row.notification_time,
        recurrence: "one_time",
      };
    case "weekly":
      return {
        ...content,
        notificationTime: row.notification_time,
        recurrence: "weekly",
        weekday: row.weekday ?? 1,
      };
    case "semimonthly":
      return {
        ...content,
        notificationTime: row.notification_time,
        recurrence: "semimonthly",
      };
    case "monthly":
      return {
        ...content,
        dayOfMonth: row.day_of_month ?? 1,
        notificationTime: row.notification_time,
        recurrence: "monthly",
      };
    case "yearly":
      return {
        ...content,
        dayOfMonth: row.day_of_month ?? 1,
        monthOfYear: row.month_of_year ?? 1,
        notificationTime: row.notification_time,
        recurrence: "yearly",
      };
  }
}
