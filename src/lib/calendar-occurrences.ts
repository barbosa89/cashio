import {
  daysInMonth,
  formatLocalDate,
  parseLocalDateTime,
  type CalendarEvent,
} from "@/lib/calendar-events";

export type CalendarOccurrence = {
  date: Date;
  dateKey: string;
  event: CalendarEvent;
};

export type CalendarVisibleMonth = {
  month: number;
  year: number;
};

export function moveCalendarMonth(
  visibleMonth: CalendarVisibleMonth,
  selectedDay: number,
  delta: number,
) {
  const nextDate = new Date(
    visibleMonth.year,
    visibleMonth.month - 1 + delta,
    1,
  );
  const nextMonth = {
    month: nextDate.getMonth() + 1,
    year: nextDate.getFullYear(),
  };
  return {
    selectedDay: Math.min(
      selectedDay,
      daysInMonth(nextMonth.year, nextMonth.month),
    ),
    visibleMonth: nextMonth,
  };
}

export function getLocaleFirstWeekday(locale: string): number {
  try {
    const LocaleConstructor = Intl.Locale;
    const localeValue = new LocaleConstructor(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const weekInfo = localeValue.getWeekInfo?.() ?? localeValue.weekInfo;
    if (weekInfo) {
      return weekInfo.firstDay % 7;
    }
  } catch {
    // Fall through to a deterministic locale-aware default.
  }
  return /(^|-)US($|-)/i.test(locale) ? 0 : 1;
}

function occurrence(event: CalendarEvent, date: Date): CalendarOccurrence {
  return {
    date,
    dateKey: formatLocalDate(date),
    event,
  };
}

function atEventTime(
  event: CalendarEvent,
  year: number,
  monthIndex: number,
  day: number,
) {
  const [hour, minute] = event.notificationTime.split(":").map(Number);
  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

export function getCalendarOccurrencesForMonth(
  events: CalendarEvent[],
  year: number,
  monthOfYear: number,
) {
  const occurrences: CalendarOccurrence[] = [];
  const monthIndex = monthOfYear - 1;
  const lastDay = daysInMonth(year, monthOfYear);

  for (const event of events) {
    switch (event.recurrence) {
      case "one_time": {
        const date = parseLocalDateTime(event.eventDate, event.notificationTime);
        if (
          date &&
          date.getFullYear() === year &&
          date.getMonth() === monthIndex
        ) {
          occurrences.push(occurrence(event, date));
        }
        break;
      }
      case "weekly": {
        const firstWeekday = new Date(year, monthIndex, 1).getDay();
        const targetWeekday = event.weekday - 1;
        const firstDay = 1 + ((targetWeekday - firstWeekday + 7) % 7);
        for (let day = firstDay; day <= lastDay; day += 7) {
          occurrences.push(
            occurrence(event, atEventTime(event, year, monthIndex, day)),
          );
        }
        break;
      }
      case "semimonthly":
        for (const day of [1, 15]) {
          occurrences.push(
            occurrence(event, atEventTime(event, year, monthIndex, day)),
          );
        }
        break;
      case "monthly": {
        const day = Math.min(event.dayOfMonth, lastDay);
        occurrences.push(
          occurrence(event, atEventTime(event, year, monthIndex, day)),
        );
        break;
      }
      case "yearly":
        if (event.monthOfYear === monthOfYear) {
          const day = Math.min(event.dayOfMonth, lastDay);
          occurrences.push(
            occurrence(event, atEventTime(event, year, monthIndex, day)),
          );
        }
        break;
    }
  }

  return occurrences.sort((left, right) => {
    const byDate = left.date.getTime() - right.date.getTime();
    if (byDate !== 0) {
      return byDate;
    }
    const byCreation = right.event.createdAt.localeCompare(left.event.createdAt);
    return byCreation || right.event.id - left.event.id;
  });
}

export function groupCalendarOccurrencesByDate(
  occurrences: CalendarOccurrence[],
) {
  const grouped = new Map<string, CalendarOccurrence[]>();
  for (const item of occurrences) {
    const dateOccurrences = grouped.get(item.dateKey) ?? [];
    dateOccurrences.push(item);
    grouped.set(item.dateKey, dateOccurrences);
  }
  return grouped;
}
