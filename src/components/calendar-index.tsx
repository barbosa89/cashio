import { router, useNavigation } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, BottomTabInset, Spacing } from "@/constants/theme";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import { formatDateTime, formatMonthName, formatNumber } from "@/i18n/formatters";
import { useLocalization, useTranslation } from "@/i18n/localization-provider";
import {
  getNextCalendarOccurrence,
  type CalendarEvent,
} from "@/lib/calendar-events";
import {
  openCalendarNotificationSettings,
  openExactAlarmSettings,
  requestCalendarNotificationPermission,
} from "@/lib/calendar-notifications";

function recurrenceDescription(
  event: CalendarEvent,
  locale: string,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (event.recurrence) {
    case "one_time":
      return t("calendar.recurrences.one_time");
    case "weekly": {
      const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
        new Date(2024, 0, 7 + event.weekday - 1),
      );
      return t("calendar.weeklySummary", { time: event.notificationTime, weekday });
    }
    case "semimonthly":
      return t("calendar.semimonthlySummary", { time: event.notificationTime });
    case "monthly":
      return t("calendar.monthlySummary", {
        day: event.dayOfMonth,
        time: event.notificationTime,
      });
    case "yearly":
      return t("calendar.yearlySummary", {
        day: event.dayOfMonth,
        month: formatMonthName(2024, event.monthOfYear, locale),
        time: event.notificationTime,
      });
  }
}

function CalendarEventRow({
  event,
  notificationStatus,
  onDelete,
}: {
  event: CalendarEvent;
  notificationStatus: ReturnType<typeof useCalendarEvents>["notificationStatus"];
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const nextOccurrence = getNextCalendarOccurrence(event);
  const statusLabel =
    event.recurrence === "one_time" && !nextOccurrence
      ? t("calendar.expired")
      : notificationStatus === "scheduled"
        ? t("calendar.notificationActive")
        : notificationStatus === "web"
          ? t("calendar.mobileOnly")
          : t("calendar.notificationDisabled");

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.rowMain}>
          <ThemedText selectable type="smallBold" style={styles.rowTitle}>
            {event.title}
          </ThemedText>
          {event.amount !== null ? (
            <ThemedText selectable type="small">
              $ {formatNumber(event.amount, languageTag)}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={t("accessibility.editNamed", { name: event.title })}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/calendar/[id]/edit",
                params: { id: String(event.id) },
              })
            }
            style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
          >
            <AppIcon color={theme.text} name="edit-2" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel={t("accessibility.deleteNamed", { name: event.title })}
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
          >
            <AppIcon color={theme.text} name="trash-2" size={18} />
          </Pressable>
        </View>
      </View>
      {event.notes ? (
        <ThemedText selectable type="small" themeColor="textSecondary">
          {event.notes}
        </ThemedText>
      ) : null}
      <ThemedText selectable type="small" themeColor="textSecondary">
        {recurrenceDescription(event, languageTag, t)}
      </ThemedText>
      <ThemedText selectable type="small" themeColor="textSecondary">
        {nextOccurrence
          ? t("calendar.nextOccurrence", {
              date: formatDateTime(nextOccurrence.toISOString(), languageTag),
            })
          : t("calendar.expired")}
      </ThemedText>
      <View style={styles.statusRow}>
        <AppIcon
          color={notificationStatus === "scheduled" && nextOccurrence ? theme.text : theme.textSecondary}
          name={notificationStatus === "scheduled" && nextOccurrence ? "bell" : "bell-off"}
          size={15}
        />
        <ThemedText selectable type="small" themeColor="textSecondary">
          {statusLabel}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export function CalendarIndex() {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const theme = useTheme();
  const { t } = useTranslation();
  const { events, isLoading, notificationStatus, refresh, removeEvent } = useCalendarEvents();
  const [message, setMessage] = useState("");

  async function deleteEvent(event: CalendarEvent) {
    async function executeDelete() {
      try {
        await removeEvent(event.id);
        setMessage(t("calendar.deleted"));
      } catch (error) {
        setMessage(translateError(error, t));
      }
    }

    const prompt = t("calendar.deletePrompt", { title: event.title });
    if (Platform.OS === "web") {
      if (confirm(prompt)) {
        await executeDelete();
      }
      return;
    }
    Alert.alert(t("calendar.deleteTitle"), prompt, [
      { style: "cancel", text: t("common.cancel") },
      { onPress: () => void executeDelete(), style: "destructive", text: t("common.delete") },
    ]);
  }

  async function repairNotifications() {
    if (notificationStatus === "error" && Platform.OS === "android") {
      await openExactAlarmSettings();
      await refresh();
      return;
    }
    const granted = await requestCalendarNotificationPermission();
    if (granted) {
      await refresh();
    } else {
      await openCalendarNotificationSettings();
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={[styles.phoneSurface, { borderColor: theme.backgroundSelected }]}>
          <ThemedView style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.openMenu")}
              accessibilityRole="button"
              onPress={() => navigation.openDrawer()}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView style={styles.menuButton}>
                <AppIcon color={theme.text} name="menu" size={30} />
              </ThemedView>
            </Pressable>
            <ThemedText type="subtitle" style={styles.screenTitle}>
              {t("navigation.calendar")}
            </ThemedText>
          </ThemedView>

          {notificationStatus !== "scheduled" ? (
            <ThemedView type="backgroundSelected" style={styles.notice}>
              <View style={styles.noticeText}>
                <ThemedText type="smallBold">
                  {notificationStatus === "web"
                    ? t("calendar.webNotice")
                    : t("calendar.notificationNotice")}
                </ThemedText>
              </View>
              {notificationStatus !== "web" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void repairNotifications()}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <ThemedText type="smallBold">{t("calendar.openSettings")}</ThemedText>
                </Pressable>
              ) : null}
            </ThemedView>
          ) : null}

          {message ? (
            <ThemedText accessibilityRole="alert" selectable type="small" themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.listContent}
            contentInsetAdjustmentBehavior="automatic"
            style={styles.list}
          >
            {!isLoading && events.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <AppIcon color={theme.textSecondary} name="calendar" size={42} />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t("calendar.empty")}
                </ThemedText>
              </ThemedView>
            ) : (
              events.map((event) => (
                <CalendarEventRow
                  key={event.id}
                  event={event}
                  notificationStatus={notificationStatus}
                  onDelete={() => void deleteEvent(event)}
                />
              ))
            )}
          </ScrollView>

          <Pressable
            accessibilityLabel={t("accessibility.addCalendarEvent")}
            accessibilityRole="button"
            onPress={() => router.push("/calendar/new")}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <AppIcon color={AppPalette.foregroundInverse} name="plus" size={36} />
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: Spacing.one },
  container: { flex: 1 },
  emptyState: { alignItems: "center", gap: Spacing.two, justifyContent: "center", minHeight: 280 },
  fab: { alignItems: "center", backgroundColor: AppPalette.brandOrange, borderRadius: Spacing.two, bottom: BottomTabInset + Spacing.three, height: 48, justifyContent: "center", position: "absolute", right: Spacing.three, width: 64, zIndex: 2 },
  fabPressed: { backgroundColor: AppPalette.brandOrangeActive },
  header: { alignItems: "center", flexDirection: "row", gap: Spacing.two, paddingBottom: Spacing.two, paddingTop: Spacing.four },
  iconAction: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  list: { flex: 1 },
  listContent: { gap: Spacing.two, paddingBottom: BottomTabInset + 96, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  menuButton: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  message: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  notice: { alignItems: "center", borderRadius: Spacing.two, flexDirection: "row", gap: Spacing.two, justifyContent: "space-between", marginHorizontal: Spacing.three, padding: Spacing.three },
  noticeText: { flex: 1 },
  phoneSurface: { borderWidth: Platform.OS === "web" ? 1 : 0, flex: 1, maxWidth: 430, position: "relative", width: "100%" },
  pressed: { opacity: 0.7 },
  row: { borderRadius: Spacing.two, gap: Spacing.one, padding: Spacing.three },
  rowHeader: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.two },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 22 },
  safeArea: { alignItems: "center", flex: 1, paddingHorizontal: Spacing.three, paddingTop: Platform.OS === "web" ? Spacing.three : 0 },
  screenTitle: { flex: 1, fontSize: 24, lineHeight: 30 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: Spacing.one },
});
