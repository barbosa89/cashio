import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { listCalendarEvents } from "@/lib/calendar-repository";
import { reconcileCalendarNotifications } from "@/lib/calendar-notifications";

function openNotificationUrl(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === "string" && /^\/calendar\/\d+\/edit$/.test(url)) {
    router.push(url as never);
    Notifications.clearLastNotificationResponse();
  }
}

export function CalendarNotificationController() {
  const db = useSQLiteContext();

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    async function reconcile() {
      const events = await listCalendarEvents(db);
      await reconcileCalendarNotifications(events);
    }

    void reconcile();
    openNotificationUrl(Notifications.getLastNotificationResponse());

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openNotificationUrl);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reconcile();
      }
    });

    return () => {
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, [db]);

  return null;
}
