import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import CurrencyInput from "react-native-currency-input";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTheme } from "@/hooks/use-theme";
import { translateError } from "@/i18n/errors";
import { formatMonthName, getNumberSeparators } from "@/i18n/formatters";
import {
  useLocalization,
  useTranslation,
} from "@/i18n/localization-provider";
import {
  CALENDAR_RECURRENCES,
  daysInMonth,
  formatLocalDate,
  formatLocalTime,
  parseLocalDateTime,
  type CalendarEvent,
  type CalendarRecurrence,
  type SaveCalendarEventInput,
} from "@/lib/calendar-events";
import { openExactAlarmSettings } from "@/lib/calendar-notifications";

type CalendarEventFormProps = {
  event?: CalendarEvent;
  heading: string;
  submitLabel: string;
};

type PickerMode = "date" | "time" | null;

function initialMoment() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date;
}

function parseDateValue(value: string) {
  return parseLocalDateTime(value, "12:00") ?? initialMoment();
}

function parseTimeValue(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function ChoiceButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={selected ? "backgroundSelected" : "background"}
        style={styles.choice}
      >
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function TimeField({
  onChange,
  onPress,
  value,
}: {
  onChange: (value: string) => void;
  onPress: () => void;
  value: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (Platform.OS === "web") {
    return (
      <TextInput
        accessibilityLabel={t("accessibility.selectCalendarTime")}
        maxLength={5}
        onChangeText={onChange}
        placeholder="HH:mm"
        style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
        value={value}
      />
    );
  }

  return (
    <Pressable
      accessibilityLabel={t("accessibility.selectCalendarTime")}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={[styles.dateInput, { borderColor: theme.backgroundSelected }]}>
        <ThemedText>{value}</ThemedText>
        <AppIcon color={theme.text} name="clock" size={20} />
      </View>
    </Pressable>
  );
}

function OneTimeScheduleFields({
  eventDate,
  onDateChange,
  onOpenDate,
  onOpenTime,
  onTimeChange,
  notificationTime,
}: {
  eventDate: string;
  notificationTime: string;
  onDateChange: (value: string) => void;
  onOpenDate: () => void;
  onOpenTime: () => void;
  onTimeChange: (value: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Field label={t("calendar.date")}>
        {Platform.OS === "web" ? (
          <TextInput
            accessibilityLabel={t("accessibility.selectCalendarDate")}
            maxLength={10}
            onChangeText={onDateChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
            value={eventDate}
          />
        ) : (
          <Pressable
            accessibilityLabel={t("accessibility.selectCalendarDate")}
            accessibilityRole="button"
            onPress={onOpenDate}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={[styles.dateInput, { borderColor: theme.backgroundSelected }]}>
              <ThemedText>{eventDate}</ThemedText>
              <AppIcon color={theme.text} name="calendar" size={20} />
            </View>
          </Pressable>
        )}
      </Field>
      <Field label={t("calendar.time")}>
        {Platform.OS === "web" ? (
          <TextInput
            accessibilityLabel={t("accessibility.selectCalendarTime")}
            maxLength={5}
            onChangeText={onTimeChange}
            placeholder="HH:mm"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
            value={notificationTime}
          />
        ) : (
          <TimeField onChange={onTimeChange} onPress={onOpenTime} value={notificationTime} />
        )}
      </Field>
    </>
  );
}

function WeeklyScheduleFields({
  labels,
  notificationTime,
  onOpenTime,
  onTimeChange,
  onWeekdayChange,
  weekday,
}: {
  labels: string[];
  notificationTime: string;
  onOpenTime: () => void;
  onTimeChange: (value: string) => void;
  onWeekdayChange: (value: number) => void;
  weekday: number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Field label={t("calendar.weekday")}>
        <View style={styles.choices}>
          {labels.map((label, index) => (
            <ChoiceButton
              key={label}
              label={label}
              onPress={() => onWeekdayChange(index + 1)}
              selected={weekday === index + 1}
            />
          ))}
        </View>
      </Field>
      <Field label={t("calendar.time")}>
        <TimeField onChange={onTimeChange} onPress={onOpenTime} value={notificationTime} />
      </Field>
    </>
  );
}

function SemimonthlyScheduleFields({
  notificationTime,
  onOpenTime,
  onTimeChange,
}: {
  notificationTime: string;
  onOpenTime: () => void;
  onTimeChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        {t("calendar.semimonthlyDescription")}
      </ThemedText>
      <Field label={t("calendar.time")}>
        <TimeField onChange={onTimeChange} onPress={onOpenTime} value={notificationTime} />
      </Field>
    </>
  );
}

function DayOfMonthField({ onChange, value }: { onChange: (value: number) => void; value: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Field label={t("calendar.dayOfMonth")}>
      <TextInput
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={(text) => onChange(Number(text))}
        style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
        value={value ? String(value) : ""}
      />
    </Field>
  );
}

function MonthlyScheduleFields({
  dayOfMonth,
  notificationTime,
  onDayChange,
  onOpenTime,
  onTimeChange,
}: {
  dayOfMonth: number;
  notificationTime: string;
  onDayChange: (value: number) => void;
  onOpenTime: () => void;
  onTimeChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <DayOfMonthField onChange={onDayChange} value={dayOfMonth} />
      <ThemedText type="small" themeColor="textSecondary">
        {t("calendar.monthEndDescription")}
      </ThemedText>
      <Field label={t("calendar.time")}>
        <TimeField onChange={onTimeChange} onPress={onOpenTime} value={notificationTime} />
      </Field>
    </>
  );
}

function YearlyScheduleFields({
  dayOfMonth,
  monthLabels,
  monthOfYear,
  notificationTime,
  onDayChange,
  onMonthChange,
  onOpenTime,
  onTimeChange,
}: {
  dayOfMonth: number;
  monthLabels: string[];
  monthOfYear: number;
  notificationTime: string;
  onDayChange: (value: number) => void;
  onMonthChange: (value: number) => void;
  onOpenTime: () => void;
  onTimeChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Field label={t("calendar.month")}>
        <View style={styles.choices}>
          {monthLabels.map((label, index) => (
            <ChoiceButton
              key={label}
              label={label}
              onPress={() => onMonthChange(index + 1)}
              selected={monthOfYear === index + 1}
            />
          ))}
        </View>
      </Field>
      <DayOfMonthField onChange={onDayChange} value={dayOfMonth} />
      <Field label={t("calendar.time")}>
        <TimeField onChange={onTimeChange} onPress={onOpenTime} value={notificationTime} />
      </Field>
    </>
  );
}

function CalendarEventForm({ event, heading, submitLabel }: CalendarEventFormProps) {
  const theme = useTheme();
  const { languageTag } = useLocalization();
  const { t } = useTranslation();
  const { addEvent, editEvent } = useCalendarEvents();
  const [defaults] = useState(initialMoment);
  const separators = getNumberSeparators(languageTag);
  const [title, setTitle] = useState(event?.title ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [amount, setAmount] = useState<number | null>(event?.amount ?? null);
  const [recurrence, setRecurrence] = useState<CalendarRecurrence>(
    event?.recurrence ?? "one_time",
  );
  const [eventDate, setEventDate] = useState(
    event?.recurrence === "one_time" ? event.eventDate : formatLocalDate(defaults),
  );
  const [notificationTime, setNotificationTime] = useState(
    event?.notificationTime ?? formatLocalTime(defaults),
  );
  const [weekday, setWeekday] = useState(
    event?.recurrence === "weekly" ? event.weekday : defaults.getDay() + 1,
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    event && "dayOfMonth" in event ? event.dayOfMonth : defaults.getDate(),
  );
  const [monthOfYear, setMonthOfYear] = useState(
    event?.recurrence === "yearly" ? event.monthOfYear : defaults.getMonth() + 1,
  );
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(languageTag, { weekday: "short" }).format(
          new Date(2024, 0, 7 + index),
        ),
      ),
    [languageTag],
  );
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        formatMonthName(2024, index + 1, languageTag, "short"),
      ),
    [languageTag],
  );

  function openPicker(mode: Exclude<PickerMode, null>) {
    const value = mode === "date" ? parseDateValue(eventDate) : parseTimeValue(notificationTime);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode,
        onValueChange: (_event, selectedDate) => {
          if (mode === "date") {
            setEventDate(formatLocalDate(selectedDate));
          } else {
            setNotificationTime(formatLocalTime(selectedDate));
          }
        },
        value,
      });
      return;
    }
    setPickerMode(mode);
  }

  function buildInput(): SaveCalendarEventInput {
    const content = { amount, notes, title };
    switch (recurrence) {
      case "one_time":
        return { ...content, eventDate, notificationTime, recurrence };
      case "weekly":
        return { ...content, notificationTime, recurrence, weekday };
      case "semimonthly":
        return { ...content, notificationTime, recurrence };
      case "monthly":
        return { ...content, dayOfMonth, notificationTime, recurrence };
      case "yearly":
        return {
          ...content,
          dayOfMonth,
          monthOfYear,
          notificationTime,
          recurrence,
        };
    }
  }

  async function handleSave() {
    setMessage("");
    setIsSaving(true);
    try {
      if (event) {
        await editEvent(event.id, buildInput());
      } else {
        const result = await addEvent(buildInput());
        if (result.offerExactAlarmSettings) {
          Alert.alert(
            t("calendar.exactAlarmTitle"),
            t("calendar.exactAlarmDescription"),
            [
              { style: "cancel", text: t("common.cancel") },
              {
                onPress: () => void openExactAlarmSettings(),
                text: t("calendar.openSettings"),
              },
            ],
          );
        }
      }
      router.replace("/calendar");
    } catch (error) {
      setMessage(translateError(error, t));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={t("accessibility.backToCalendar")}
              accessibilityRole="button"
              onPress={() => router.replace("/calendar")}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView style={[styles.backButton, { borderColor: theme.text }]}>
                <AppIcon color={theme.text} name="arrow-left" size={22} />
              </ThemedView>
            </Pressable>
            <ThemedText type="title" style={styles.title}>{heading}</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <Field label={t("calendar.eventTitle")}>
              <TextInput
                onChangeText={setTitle}
                placeholder={t("calendar.eventTitlePlaceholder")}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                value={title}
              />
            </Field>
            <Field label={`${t("calendar.notes")} (${t("common.optional")})`}>
              <TextInput
                multiline
                onChangeText={setNotes}
                placeholder={t("calendar.notesPlaceholder")}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, styles.notesInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                textAlignVertical="top"
                value={notes}
              />
            </Field>
            <Field label={`${t("calendar.amount")} (${t("common.optional")})`}>
              <CurrencyInput
                delimiter={separators.delimiter}
                keyboardType="numeric"
                minValue={0}
                onChangeValue={setAmount}
                placeholder="$ 0"
                placeholderTextColor={theme.textSecondary}
                precision={0}
                prefix="$ "
                separator={separators.separator}
                style={[styles.input, { borderColor: theme.backgroundSelected, color: theme.text }]}
                value={amount}
              />
            </Field>
            <Field label={t("calendar.recurrence")}>
              <View style={styles.choices}>
                {CALENDAR_RECURRENCES.map((value) => (
                  <ChoiceButton
                    key={value}
                    label={t(`calendar.recurrences.${value}`)}
                    onPress={() => setRecurrence(value)}
                    selected={recurrence === value}
                  />
                ))}
              </View>
            </Field>

            {recurrence === "one_time" ? (
              <OneTimeScheduleFields
                eventDate={eventDate}
                notificationTime={notificationTime}
                onDateChange={setEventDate}
                onOpenDate={() => openPicker("date")}
                onOpenTime={() => openPicker("time")}
                onTimeChange={setNotificationTime}
              />
            ) : recurrence === "weekly" ? (
              <WeeklyScheduleFields
                labels={weekdayLabels}
                notificationTime={notificationTime}
                onOpenTime={() => openPicker("time")}
                onTimeChange={setNotificationTime}
                onWeekdayChange={setWeekday}
                weekday={weekday}
              />
            ) : recurrence === "semimonthly" ? (
              <SemimonthlyScheduleFields
                notificationTime={notificationTime}
                onOpenTime={() => openPicker("time")}
                onTimeChange={setNotificationTime}
              />
            ) : recurrence === "monthly" ? (
              <MonthlyScheduleFields
                dayOfMonth={dayOfMonth}
                notificationTime={notificationTime}
                onDayChange={setDayOfMonth}
                onOpenTime={() => openPicker("time")}
                onTimeChange={setNotificationTime}
              />
            ) : (
              <YearlyScheduleFields
                dayOfMonth={dayOfMonth}
                monthLabels={monthLabels}
                monthOfYear={monthOfYear}
                notificationTime={notificationTime}
                onDayChange={setDayOfMonth}
                onMonthChange={(value) => {
                  setMonthOfYear(value);
                  setDayOfMonth((current) => Math.min(current, daysInMonth(2024, value)));
                }}
                onOpenTime={() => openPicker("time")}
                onTimeChange={setNotificationTime}
              />
            )}

            {pickerMode && Platform.OS === "ios" ? (
              <ThemedView type="background" style={styles.pickerPanel}>
                <DateTimePicker
                  display="spinner"
                  mode={pickerMode}
                  onValueChange={(_event, selectedDate) => {
                    if (pickerMode === "date") {
                      setEventDate(formatLocalDate(selectedDate));
                    } else {
                      setNotificationTime(formatLocalTime(selectedDate));
                    }
                  }}
                  value={pickerMode === "date" ? parseDateValue(eventDate) : parseTimeValue(notificationTime)}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPickerMode(null)}
                  style={styles.doneButton}
                >
                  <ThemedText type="smallBold">{t("common.close")}</ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}

            {message ? (
              <ThemedText accessibilityRole="alert" selectable type="small" themeColor="textSecondary">
                {message}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleSave}
              style={({ pressed }) => [pressed && styles.pressed, isSaving && styles.disabled]}
            >
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="smallBold">
                  {isSaving ? t("common.saving") : submitLabel}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

export function NewCalendarEventEditor() {
  const { t } = useTranslation();
  return <CalendarEventForm heading={t("calendar.newTitle")} submitLabel={t("calendar.create")} />;
}

export function EditCalendarEventEditor({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation();
  return (
    <CalendarEventForm
      event={event}
      heading={t("calendar.editTitle")}
      submitLabel={t("calendar.save")}
    />
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", borderRadius: 16, borderWidth: 2, height: 32, justifyContent: "center", width: 32 },
  choice: { borderRadius: Spacing.two, minHeight: 38, justifyContent: "center", paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  container: { flex: 1 },
  dateInput: { alignItems: "center", borderRadius: Spacing.two, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 44, paddingHorizontal: Spacing.three },
  disabled: { opacity: 0.45 },
  doneButton: { alignItems: "center", minHeight: 44, justifyContent: "center" },
  field: { gap: Spacing.two },
  header: { alignItems: "center", flexDirection: "row", gap: Spacing.two, paddingTop: Platform.OS === "web" ? Spacing.five : Spacing.three },
  input: { borderRadius: Spacing.two, borderWidth: 1, fontSize: 16, minHeight: 44, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  notesInput: { minHeight: 96 },
  panel: { borderRadius: Spacing.two, gap: Spacing.three, padding: Spacing.three },
  pickerPanel: { borderRadius: Spacing.two, padding: Spacing.two },
  pressed: { opacity: 0.7 },
  safeArea: { gap: Spacing.four, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, width: "100%" },
  saveButton: { alignItems: "center", borderRadius: Spacing.two, minHeight: 48, justifyContent: "center", paddingHorizontal: Spacing.three },
  scrollContent: { alignItems: "center", paddingBottom: BottomTabInset + Spacing.five },
  scrollView: { flex: 1 },
  title: { flex: 1, fontSize: 32, lineHeight: 38 },
});
