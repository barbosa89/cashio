import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { CalendarNotificationStatus } from "@/lib/calendar-notifications";
import { useTheme } from "@/hooks/use-theme";
import { formatDateTime, formatMonthName, formatNumber } from "@/i18n/formatters";
import { useLocalization, useTranslation } from "@/i18n/localization-provider";
import {
  getNextCalendarOccurrence,
  type CalendarEvent,
} from "@/lib/calendar-events";

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
      return t("calendar.weeklySummary", {
        time: event.notificationTime,
        weekday,
      });
    }
    case "semimonthly":
      return t("calendar.semimonthlySummary", {
        time: event.notificationTime,
      });
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

export function CalendarEventCard({
  event,
  notificationStatus,
  occurrence,
  onDelete,
}: {
  event: CalendarEvent;
  notificationStatus: CalendarNotificationStatus;
  occurrence?: Date;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const nextOccurrence = getNextCalendarOccurrence(event);
  const isExpired = event.recurrence === "one_time" && !nextOccurrence;
  const statusLabel = isExpired
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
            accessibilityLabel={t("accessibility.editNamed", {
              name: event.title,
            })}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/calendar/[id]/edit",
                params: { id: String(event.id) },
              })
            }
            style={({ pressed }) => [
              styles.iconAction,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon color={theme.text} name="edit-2" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel={t("accessibility.deleteNamed", {
              name: event.title,
            })}
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [
              styles.iconAction,
              pressed && styles.pressed,
            ]}
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
        {occurrence
          ? t("calendar.occurrenceTime", { time: event.notificationTime })
          : nextOccurrence
            ? t("calendar.nextOccurrence", {
                date: formatDateTime(nextOccurrence.toISOString(), languageTag),
              })
            : t("calendar.expired")}
      </ThemedText>
      <View style={styles.statusRow}>
        <AppIcon
          color={
            notificationStatus === "scheduled" && !isExpired
              ? theme.text
              : theme.textSecondary
          }
          name={
            notificationStatus === "scheduled" && !isExpired
              ? "bell"
              : "bell-off"
          }
          size={15}
        />
        <ThemedText selectable type="small" themeColor="textSecondary">
          {statusLabel}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: Spacing.one },
  iconAction: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { opacity: 0.7 },
  row: {
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  rowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 22 },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
});
