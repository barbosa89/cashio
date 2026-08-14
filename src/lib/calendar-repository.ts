import type { SQLiteDatabase } from "expo-sqlite";

import { AppError } from "@/i18n/errors";
import {
  calendarEventFromRow,
  parseLocalDateTime,
  type CalendarEvent,
  type CalendarEventRow,
  type SaveCalendarEventInput,
} from "@/lib/calendar-events";

function normalizeText(value: string) {
  return value.trim();
}

function assertIntegerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function validateCalendarEventInput(
  input: SaveCalendarEventInput,
  now = new Date(),
) {
  const title = normalizeText(input.title);
  const notes = normalizeText(input.notes);

  if (!title) {
    throw new AppError({ code: "emptyCalendarTitle" });
  }
  if (input.amount !== null && (!Number.isFinite(input.amount) || input.amount <= 0)) {
    throw new AppError({ code: "invalidCalendarAmount" });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.notificationTime)) {
    throw new AppError({ code: "invalidCalendarTime" });
  }

  switch (input.recurrence) {
    case "one_time": {
      const date = parseLocalDateTime(input.eventDate, input.notificationTime);
      if (!date || date.getTime() <= now.getTime()) {
        throw new AppError({ code: "pastCalendarEvent" });
      }
      break;
    }
    case "weekly":
      if (!assertIntegerInRange(input.weekday, 1, 7)) {
        throw new AppError({ code: "invalidCalendarSchedule" });
      }
      break;
    case "monthly":
      if (!assertIntegerInRange(input.dayOfMonth, 1, 31)) {
        throw new AppError({ code: "invalidCalendarSchedule" });
      }
      break;
    case "yearly":
      if (
        !assertIntegerInRange(input.monthOfYear, 1, 12) ||
        !assertIntegerInRange(
          input.dayOfMonth,
          1,
          new Date(2024, input.monthOfYear, 0).getDate(),
        )
      ) {
        throw new AppError({ code: "invalidCalendarSchedule" });
      }
      break;
    case "semimonthly":
      break;
  }

  return { ...input, notes, title };
}

function toColumns(input: SaveCalendarEventInput) {
  switch (input.recurrence) {
    case "one_time":
      return {
        dayOfMonth: null,
        eventDate: input.eventDate,
        monthOfYear: null,
        weekday: null,
      };
    case "weekly":
      return {
        dayOfMonth: null,
        eventDate: null,
        monthOfYear: null,
        weekday: input.weekday,
      };
    case "semimonthly":
      return {
        dayOfMonth: null,
        eventDate: null,
        monthOfYear: null,
        weekday: null,
      };
    case "monthly":
      return {
        dayOfMonth: input.dayOfMonth,
        eventDate: null,
        monthOfYear: null,
        weekday: null,
      };
    case "yearly":
      return {
        dayOfMonth: input.dayOfMonth,
        eventDate: null,
        monthOfYear: input.monthOfYear,
        weekday: null,
      };
  }
}

const SELECT_CALENDAR_EVENT = `
  SELECT
    id,
    title,
    notes,
    amount,
    recurrence,
    event_date,
    weekday,
    day_of_month,
    month_of_year,
    notification_time,
    created_at,
    updated_at
  FROM calendar_events
`;

export async function listCalendarEvents(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<CalendarEventRow>(
    `${SELECT_CALENDAR_EVENT} ORDER BY created_at DESC, id DESC`,
  );
  return rows.map(calendarEventFromRow);
}

export async function getCalendarEvent(db: SQLiteDatabase, id: number) {
  const row = await db.getFirstAsync<CalendarEventRow>(
    `${SELECT_CALENDAR_EVENT} WHERE id = ?`,
    id,
  );
  return row ? calendarEventFromRow(row) : null;
}

export async function createCalendarEvent(
  db: SQLiteDatabase,
  rawInput: SaveCalendarEventInput,
) {
  const input = validateCalendarEventInput(rawInput);
  const columns = toColumns(input);
  const timestamp = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO calendar_events
      (
        title, notes, amount, recurrence, event_date, weekday,
        day_of_month, month_of_year, notification_time, created_at, updated_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.notes || null,
    input.amount,
    input.recurrence,
    columns.eventDate,
    columns.weekday,
    columns.dayOfMonth,
    columns.monthOfYear,
    input.notificationTime,
    timestamp,
    timestamp,
  );
  return getCalendarEvent(db, result.lastInsertRowId) as Promise<CalendarEvent>;
}

export async function updateCalendarEvent(
  db: SQLiteDatabase,
  id: number,
  rawInput: SaveCalendarEventInput,
) {
  const input = validateCalendarEventInput(rawInput);
  const columns = toColumns(input);
  await db.runAsync(
    `UPDATE calendar_events
     SET title = ?, notes = ?, amount = ?, recurrence = ?, event_date = ?,
       weekday = ?, day_of_month = ?, month_of_year = ?, notification_time = ?,
       updated_at = ?
     WHERE id = ?`,
    input.title,
    input.notes || null,
    input.amount,
    input.recurrence,
    columns.eventDate,
    columns.weekday,
    columns.dayOfMonth,
    columns.monthOfYear,
    input.notificationTime,
    new Date().toISOString(),
    id,
  );
  return getCalendarEvent(db, id);
}

export async function deleteCalendarEvent(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM calendar_events WHERE id = ?", id);
}
