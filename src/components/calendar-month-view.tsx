import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CalendarEventCard } from "@/components/calendar-event-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppPalette, BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { capitalizeLocalized, formatMonthYear } from "@/i18n/formatters";
import { useLocalization, useTranslation } from "@/i18n/localization-provider";
import {
  getCalendarOccurrencesForMonth,
  getLocaleFirstWeekday,
  groupCalendarOccurrencesByDate,
  type CalendarVisibleMonth,
} from "@/lib/calendar-occurrences";
import { daysInMonth, formatLocalDate, type CalendarEvent } from "@/lib/calendar-events";
import type { CalendarNotificationStatus } from "@/lib/calendar-notifications";

type CalendarMonthViewProps = {
  events: CalendarEvent[];
  notificationStatus: CalendarNotificationStatus;
  onDelete: (event: CalendarEvent) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDay: (day: number) => void;
  selectedDay: number;
  visibleMonth: CalendarVisibleMonth;
};

function calendarDateLabel(date: Date, locale: string) {
  return capitalizeLocalized(
    new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date),
    locale,
  );
}

export function CalendarMonthView({
  events,
  notificationStatus,
  onDelete,
  onNextMonth,
  onPreviousMonth,
  onSelectDay,
  selectedDay,
  visibleMonth,
}: CalendarMonthViewProps) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const { month, year } = visibleMonth;
  const firstWeekday = getLocaleFirstWeekday(languageTag);
  const monthStartWeekday = new Date(year, month - 1, 1).getDay();
  const leadingEmptyDays = (monthStartWeekday - firstWeekday + 7) % 7;
  const monthDays = daysInMonth(year, month);
  const trailingEmptyDays =
    (7 - ((leadingEmptyDays + monthDays) % 7)) % 7;
  const selectedDate = new Date(year, month - 1, selectedDay, 12, 0, 0, 0);
  const selectedDateKey = formatLocalDate(selectedDate);
  const todayKey = formatLocalDate(new Date());
  const occurrencesByDate = useMemo(
    () =>
      groupCalendarOccurrencesByDate(
        getCalendarOccurrencesForMonth(events, year, month),
      ),
    [events, month, year],
  );
  const selectedOccurrences = occurrencesByDate.get(selectedDateKey) ?? [];
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const weekday = (firstWeekday + index) % 7;
        return new Intl.DateTimeFormat(languageTag, { weekday: "narrow" }).format(
          new Date(2024, 0, 7 + weekday),
        );
      }),
    [firstWeekday, languageTag],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scrollView}
    >
      <View style={styles.monthNavigation}>
        <MonthButton
          icon="chevron-left"
          label={t("accessibility.previousCalendarMonth")}
          onPress={onPreviousMonth}
        />
        <ThemedText selectable type="smallBold" style={styles.monthTitle}>
          {capitalizeLocalized(
            formatMonthYear(year, month, languageTag),
            languageTag,
          )}
        </ThemedText>
        <MonthButton
          icon="chevron-right"
          label={t("accessibility.nextCalendarMonth")}
          onPress={onNextMonth}
        />
      </View>

      <ThemedView type="backgroundElement" style={styles.calendarPanel}>
        <View style={styles.weekdayRow}>
          {weekdayLabels.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.daySlot}>
              <ThemedText
                selectable
                type="smallBold"
                themeColor="textSecondary"
                style={styles.weekdayLabel}
              >
                {label}
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {Array.from({ length: leadingEmptyDays }, (_, index) => (
            <View key={`empty-${index}`} style={styles.daySlot} />
          ))}
          {Array.from({ length: monthDays }, (_, index) => {
            const day = index + 1;
            const date = new Date(year, month - 1, day, 12, 0, 0, 0);
            const dateKey = formatLocalDate(date);
            const count = occurrencesByDate.get(dateKey)?.length ?? 0;
            const isSelected = day === selectedDay;
            const isToday = dateKey === todayKey;
            return (
              <View key={dateKey} style={styles.daySlot}>
                <Pressable
                  accessibilityLabel={t("accessibility.calendarDay", {
                    count,
                    date: calendarDateLabel(date, languageTag),
                  })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelectDay(day)}
                  style={({ pressed }) => [
                    styles.dayButton,
                    isToday && { borderColor: AppPalette.brandOrange },
                    isSelected && styles.selectedDay,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    selectable
                    type="smallBold"
                    style={isSelected && styles.selectedDayText}
                  >
                    {day}
                  </ThemedText>
                  {count > 0 ? (
                    <View style={styles.occurrenceIndicator}>
                      {Array.from(
                        { length: Math.min(count, 3) },
                        (_, dotIndex) => (
                          <View
                            key={dotIndex}
                            style={[
                              styles.dot,
                              isSelected && styles.selectedDot,
                            ]}
                            testID={`calendar-event-dot-${dateKey}-${dotIndex}`}
                          />
                        ),
                      )}
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
          {Array.from({ length: trailingEmptyDays }, (_, index) => (
            <View key={`trailing-empty-${index}`} style={styles.daySlot} />
          ))}
        </View>
      </ThemedView>

      <View style={styles.agenda}>
        <ThemedText selectable type="smallBold" style={styles.agendaTitle}>
          {calendarDateLabel(selectedDate, languageTag)}
        </ThemedText>
        {selectedOccurrences.length > 0 ? (
          selectedOccurrences.map((item) => (
            <CalendarEventCard
              event={item.event}
              key={`${item.event.id}-${item.dateKey}`}
              notificationStatus={notificationStatus}
              occurrence={item.date}
              onDelete={() => onDelete(item.event)}
            />
          ))
        ) : (
          <ThemedView style={styles.emptyAgenda}>
            <AppIcon color={theme.textSecondary} name="calendar" size={30} />
            <ThemedText selectable type="small" themeColor="textSecondary">
              {t("calendar.noEventsForDay")}
            </ThemedText>
          </ThemedView>
        )}
      </View>
    </ScrollView>
  );
}

function MonthButton({
  icon,
  label,
  onPress,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundElement" style={styles.monthButton}>
        <AppIcon color={theme.text} name={icon} size={24} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  agenda: { gap: Spacing.two },
  agendaTitle: { fontSize: 17, lineHeight: 22 },
  calendarPanel: {
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + 96,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  dayButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: "transparent",
    gap: Spacing.half,
    justifyContent: "center",
    minHeight: 52,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  daySlot: { padding: Spacing.half, width: "14.285714%" },
  dot: {
    backgroundColor: AppPalette.brandOrange,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  emptyAgenda: {
    alignItems: "center",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 120,
  },
  monthButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  monthNavigation: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  monthTitle: { flex: 1, fontSize: 18, lineHeight: 22, textAlign: "center" },
  occurrenceIndicator: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.half,
  },
  pressed: { opacity: 0.7 },
  scrollView: { flex: 1, minHeight: 0 },
  selectedDay: {
    backgroundColor: AppPalette.brandOrange,
    borderColor: AppPalette.brandOrange,
  },
  selectedDayText: { color: AppPalette.foregroundInverse },
  selectedDot: { backgroundColor: AppPalette.foregroundInverse },
  weekdayLabel: { textAlign: "center" },
  weekdayRow: { flexDirection: "row" },
});
