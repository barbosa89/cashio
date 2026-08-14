import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "@/lib/calendar-repository";
import type {
  CalendarEvent,
  SaveCalendarEventInput,
} from "@/lib/calendar-events";
import {
  cancelCalendarEventNotifications,
  reconcileCalendarNotifications,
  requestCalendarNotificationPermission,
  consumeExactAlarmSettingsOffer,
  type CalendarNotificationStatus,
} from "@/lib/calendar-notifications";

export function useCalendarEvents() {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] =
    useState<CalendarNotificationStatus>("web");

  const refresh = useCallback(async () => {
    const nextEvents = await listCalendarEvents(db);
    setEvents(nextEvents);
    setIsLoading(false);
    const status = await reconcileCalendarNotifications(nextEvents);
    setNotificationStatus(status);
    return nextEvents;
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const getEvent = useCallback(
    (id: number) => getCalendarEvent(db, id),
    [db],
  );

  const addEvent = useCallback(
    async (input: SaveCalendarEventInput) => {
      const event = await createCalendarEvent(db, input);
      let notificationsGranted = false;
      try {
        notificationsGranted = await requestCalendarNotificationPermission();
      } catch {
        // The database event remains valid even when the OS permission flow fails.
      }
      const nextEvents = await listCalendarEvents(db);
      setEvents(nextEvents);
      setNotificationStatus(await reconcileCalendarNotifications(nextEvents));
      let offerExactAlarmSettings = false;
      if (notificationsGranted) {
        try {
          offerExactAlarmSettings = await consumeExactAlarmSettingsOffer();
        } catch {
          // AsyncStorage availability must not make event creation fail.
        }
      }
      return {
        event,
        offerExactAlarmSettings,
      };
    },
    [db],
  );

  const editEvent = useCallback(
    async (id: number, input: SaveCalendarEventInput) => {
      const event = await updateCalendarEvent(db, id, input);
      const nextEvents = await listCalendarEvents(db);
      setEvents(nextEvents);
      setNotificationStatus(await reconcileCalendarNotifications(nextEvents));
      return event;
    },
    [db],
  );

  const removeEvent = useCallback(
    async (id: number) => {
      await deleteCalendarEvent(db, id);
      try {
        await cancelCalendarEventNotifications(id);
      } catch {
        // Reconciliation below will retry cleanup on the next foreground pass.
      }
      const nextEvents = await listCalendarEvents(db);
      setEvents(nextEvents);
      setNotificationStatus(await reconcileCalendarNotifications(nextEvents));
    },
    [db],
  );

  return {
    addEvent,
    editEvent,
    events,
    getEvent,
    isLoading,
    notificationStatus,
    refresh,
    removeEvent,
  };
}
