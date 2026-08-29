import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { EditCalendarEventEditor } from "@/components/calendar-event-editor";
import { ScreenStatus } from "@/components/screen-status";
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!hasValidEventId) {
      return;
    }
    void getEvent(eventId)
      .then(setEvent)
      .catch(() => setHasError(true));
  }, [eventId, getEvent, hasValidEventId]);

  if (hasError || event === null) {
    return (
      <ScreenStatus
        actionLabel={t("accessibility.backToCalendar")}
        message={hasError ? t("errors.generic") : t("calendar.notFound")}
        onAction={() => router.replace("/calendar")}
      />
    );
  }
  if (event === undefined) {
    return <ScreenStatus message={t("common.loading")} />;
  }
  return <EditCalendarEventEditor event={event} />;
}
