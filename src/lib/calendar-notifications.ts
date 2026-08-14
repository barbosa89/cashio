import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import type { CalendarEvent } from "@/lib/calendar-events";
import {
  buildCalendarNotificationPlan,
  CALENDAR_NOTIFICATION_PREFIX,
  type CalendarNotificationDefinition,
} from "@/lib/calendar-notification-plan";

const CHANNEL_ID = "financial-reminders";
const EXACT_ALARM_PROMPT_KEY = "cashio.calendar.exact-alarm-prompted.v1";

export type CalendarNotificationStatus =
  | "scheduled"
  | "denied"
  | "error"
  | "web";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    description: "Recordatorios de eventos financieros",
    importance: Notifications.AndroidImportance.HIGH,
    name: "Recordatorios financieros",
    sound: "default",
  });
}

export async function allowsCalendarNotifications() {
  if (Platform.OS === "web") {
    return false;
  }
  const permissions = await Notifications.getPermissionsAsync();
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function requestCalendarNotificationPermission() {
  if (Platform.OS === "web") {
    return false;
  }
  await ensureAndroidChannel();
  if (await allowsCalendarNotifications()) {
    return true;
  }
  const permissions = await Notifications.requestPermissionsAsync();
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function consumeExactAlarmSettingsOffer() {
  const shouldOffer =
    Platform.OS === "android" &&
    Number(Platform.Version) >= 31 &&
    (await AsyncStorage.getItem(EXACT_ALARM_PROMPT_KEY)) !== "true";
  if (shouldOffer) {
    await AsyncStorage.setItem(EXACT_ALARM_PROMPT_KEY, "true");
  }
  return shouldOffer;
}

export async function openExactAlarmSettings() {
  if (Platform.OS !== "android" || Number(Platform.Version) < 31) {
    return;
  }
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM,
  );
}

export async function openCalendarNotificationSettings() {
  await Linking.openSettings();
}

function toExpoTrigger(
  definition: CalendarNotificationDefinition,
): Notifications.NotificationTriggerInput {
  const channelId = Platform.OS === "android" ? CHANNEL_ID : undefined;
  switch (definition.trigger.kind) {
    case "date":
      return {
        channelId,
        date: definition.trigger.date,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      };
    case "weekly":
      return {
        channelId,
        hour: definition.trigger.hour,
        minute: definition.trigger.minute,
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: definition.trigger.weekday,
      };
    case "monthly":
      return {
        channelId,
        day: definition.trigger.day,
        hour: definition.trigger.hour,
        minute: definition.trigger.minute,
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      };
    case "yearly":
      return {
        channelId,
        day: definition.trigger.day,
        hour: definition.trigger.hour,
        minute: definition.trigger.minute,
        month: definition.trigger.monthIndex,
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      };
  }
}

export async function reconcileCalendarNotifications(
  events: CalendarEvent[],
): Promise<CalendarNotificationStatus> {
  if (Platform.OS === "web") {
    return "web";
  }
  try {
    await ensureAndroidChannel();
    if (!(await allowsCalendarNotifications())) {
      return "denied";
    }

    const expected = buildCalendarNotificationPlan(events);
    const expectedIds = new Set(expected.map((item) => item.identifier));
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((item) => item.identifier));
    const obsolete = scheduled.filter(
      (item) =>
        item.identifier.startsWith(CALENDAR_NOTIFICATION_PREFIX) &&
        !expectedIds.has(item.identifier),
    );

    await Promise.all(
      obsolete.map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier),
      ),
    );
    await Promise.all(
      expected
        .filter((item) => !scheduledIds.has(item.identifier))
        .map((item) =>
          Notifications.scheduleNotificationAsync({
            content: {
              body: item.body,
              data: {
                calendarEventId: item.eventId,
                url: `/calendar/${item.eventId}/edit`,
              },
              sound: "default",
              title: item.title,
            },
            identifier: item.identifier,
            trigger: toExpoTrigger(item),
          }),
        ),
    );
    return "scheduled";
  } catch {
    return "error";
  }
}

export async function cancelCalendarEventNotifications(eventId: number) {
  if (Platform.OS === "web") {
    return;
  }
  const prefix = `${CALENDAR_NOTIFICATION_PREFIX}${eventId}-`;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(prefix))
      .map((item) =>
        Notifications.cancelScheduledNotificationAsync(item.identifier),
      ),
  );
}
