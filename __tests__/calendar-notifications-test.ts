jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: {
    DATE: "date",
    MONTHLY: "monthly",
    WEEKLY: "weekly",
    YEARLY: "yearly",
  },
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("scheduled-id"),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
}));

jest.mock("expo-intent-launcher", () => ({
  ActivityAction: { REQUEST_SCHEDULE_EXACT_ALARM: "request" },
  startActivityAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import type { CalendarEvent } from "@/lib/calendar-events";
import { reconcileCalendarNotifications } from "@/lib/calendar-notifications";

const notifications = jest.requireMock("expo-notifications") as {
  cancelScheduledNotificationAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
};

const event: CalendarEvent = {
  amount: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  id: 5,
  notes: "",
  notificationTime: "08:00",
  recurrence: "weekly",
  title: "Pay utilities",
  updatedAt: "2026-01-01T00:00:00.000Z",
  weekday: 2,
};

describe("calendar notification reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    notifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  test("schedules missing event notifications with a deep link", async () => {
    await expect(reconcileCalendarNotifications([event])).resolves.toBe("scheduled");
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: { calendarEventId: 5, url: "/calendar/5/edit" },
          title: "Pay utilities",
        }),
        identifier: expect.stringMatching(/^cashio-calendar-5-/),
      }),
    );
  });

  test("cancels owned orphan notifications without touching unrelated ones", async () => {
    notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "cashio-calendar-99-old-weekly" },
      { identifier: "another-feature" },
    ]);
    await reconcileCalendarNotifications([]);
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "cashio-calendar-99-old-weekly",
    );
    expect(notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith("another-feature");
  });

  test("replaces a stale fingerprint after an edit or database restore", async () => {
    notifications.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "cashio-calendar-5-stale-weekly" },
    ]);
    await reconcileCalendarNotifications([event]);
    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "cashio-calendar-5-stale-weekly",
    );
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: expect.stringMatching(/^cashio-calendar-5-/) }),
    );
  });

  test("does not schedule when permission is denied", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(reconcileCalendarNotifications([event])).resolves.toBe("denied");
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test("reports scheduler errors without losing the database event", async () => {
    notifications.scheduleNotificationAsync.mockRejectedValueOnce(new Error("exact alarm denied"));
    await expect(reconcileCalendarNotifications([event])).resolves.toBe("error");
  });
});
