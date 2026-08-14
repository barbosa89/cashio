import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { EditCalendarEventEditor } from "@/components/calendar-event-editor";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTranslation } from "@/i18n/localization-provider";
import type { CalendarEvent } from "@/lib/calendar-events";

export default function EditCalendarEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const hasValidEventId = Number.isInteger(eventId) && eventId > 0;
  const { t } = useTranslation();
  const { getEvent } = useCalendarEvents();
  const [event, setEvent] = useState<CalendarEvent | null | undefined>(
    hasValidEventId ? undefined : null,
  );

  useEffect(() => {
    if (!hasValidEventId) {
      return;
    }
    void getEvent(eventId).then(setEvent);
  }, [eventId, getEvent, hasValidEventId]);

  if (event === undefined) {
    return null;
  }
  if (event === null) {
    return (
      <ThemedView style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
        <ThemedText type="smallBold">{t("calendar.notFound")}</ThemedText>
      </ThemedView>
    );
  }
  return <EditCalendarEventEditor event={event} />;
}
