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
import { CalendarEventCard } from "@/components/calendar-event-card";
import { CalendarMonthView } from "@/components/calendar-month-view";
import { CalendarViewMenu } from "@/components/calendar-view-menu";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, BottomTabInset, MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useCalendarViewMode } from "@/hooks/use-calendar-view-mode";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import { useTranslation } from "@/i18n/localization-provider";
import {
  moveCalendarMonth,
  type CalendarVisibleMonth,
} from "@/lib/calendar-occurrences";
import { formatLocalDate, type CalendarEvent } from "@/lib/calendar-events";
import {
  openCalendarNotificationSettings,
  openExactAlarmSettings,
  requestCalendarNotificationPermission,
} from "@/lib/calendar-notifications";

export function CalendarIndex() {
  const navigation = useNavigation<{ openDrawer: () => void }>();
  const theme = useTheme();
  const { t } = useTranslation();
  const { events, isLoading, notificationStatus, refresh, removeEvent } = useCalendarEvents();
  const { setViewMode, viewMode } = useCalendarViewMode();
  const [visibleMonth, setVisibleMonth] = useState<CalendarVisibleMonth>(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  });
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
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

  function changeMonth(delta: number) {
    const next = moveCalendarMonth(visibleMonth, selectedDay, delta);
    setVisibleMonth(next.visibleMonth);
    setSelectedDay(next.selectedDay);
  }

  function createEvent() {
    if (viewMode === "calendar") {
      router.push({
        pathname: "/calendar/new",
        params: {
          date: formatLocalDate(
            new Date(
              visibleMonth.year,
              visibleMonth.month - 1,
              selectedDay,
              12,
            ),
          ),
        },
      });
      return;
    }
    router.push("/calendar/new");
  }

  return (
    <ThemedView type="canvas" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          type="surface"
          testID="calendar-phone-surface"
          style={[styles.phoneSurface, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.openMenu")}
              accessibilityRole="button"
              onPress={() => navigation.openDrawer()}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="surfaceMuted" style={styles.menuButton}>
                <AppIcon color={theme.text} name="menu" size={30} />
              </ThemedView>
            </Pressable>
            <ThemedText
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              type="subtitle"
              style={styles.screenTitle}
            >
              {t("calendar.title")}
            </ThemedText>
            <CalendarViewMenu onChange={setViewMode} value={viewMode} />
          </View>

          {notificationStatus !== "scheduled" ? (
            <ThemedView type="primaryContainer" style={styles.notice}>
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

          {viewMode === "list" ? (
            <ScrollView
              contentContainerStyle={styles.listContent}
              contentInsetAdjustmentBehavior="automatic"
              style={styles.list}
            >
              {isLoading ? (
                <View style={styles.emptyState}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t("common.loading")}
                  </ThemedText>
                </View>
              ) : events.length === 0 ? (
                <View style={styles.emptyState}>
                  <AppIcon color={theme.textSecondary} name="calendar" size={42} />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t("calendar.empty")}
                  </ThemedText>
                </View>
              ) : (
                events.map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    notificationStatus={notificationStatus}
                    onDelete={() => void deleteEvent(event)}
                  />
                ))
              )}
            </ScrollView>
          ) : (
            <CalendarMonthView
              events={events}
              notificationStatus={notificationStatus}
              onDelete={(event) => void deleteEvent(event)}
              onNextMonth={() => changeMonth(1)}
              onPreviousMonth={() => changeMonth(-1)}
              onSelectDay={setSelectedDay}
              selectedDay={selectedDay}
              visibleMonth={visibleMonth}
            />
          )}

          <Pressable
            accessibilityLabel={t("accessibility.addCalendarEvent")}
            accessibilityRole="button"
            onPress={createEvent}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <AppIcon color={AppPalette.foregroundOnBrand} name="plus" size={36} />
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  emptyState: { alignItems: "center", gap: Spacing.two, justifyContent: "center", minHeight: 280 },
  fab: { alignItems: "center", backgroundColor: AppPalette.brandOrange, borderRadius: Radius.card, bottom: BottomTabInset + Spacing.three, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.24)", height: 48, justifyContent: "center", position: "absolute", right: Spacing.three, width: 64, zIndex: 40 },
  fabPressed: { backgroundColor: AppPalette.brandOrangeActive },
  header: { alignItems: "center", flexDirection: "row", gap: Spacing.two, paddingBottom: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, zIndex: 30 },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: Spacing.two, paddingBottom: BottomTabInset + 96, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  menuButton: { alignItems: "center", height: 48, justifyContent: "center", width: 48 },
  message: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  notice: { alignItems: "center", borderRadius: Radius.control, flexDirection: "row", gap: Spacing.two, justifyContent: "space-between", marginHorizontal: Spacing.three, padding: Spacing.three },
  noticeText: { flex: 1 },
  phoneSurface: { borderWidth: Platform.OS === "web" ? 1 : 0, flex: 1, maxWidth: MaxContentWidth, minHeight: 0, overflow: "hidden", position: "relative", width: "100%" },
  pressed: { opacity: 0.7 },
  safeArea: { alignItems: "center", flex: 1, minHeight: 0, paddingHorizontal: Spacing.three, paddingTop: Platform.OS === "web" ? Spacing.three : 0 },
  screenTitle: { flex: 1, fontSize: 24, lineHeight: 30 },
});
