import { useLocalSearchParams } from "expo-router";

import { NewCalendarEventEditor } from "@/components/calendar-event-editor";

export default function NewCalendarEventScreen() {
  const { date } = useLocalSearchParams<{ date?: string | string[] }>();
  return (
    <NewCalendarEventEditor
      initialEventDate={typeof date === "string" ? date : undefined}
    />
  );
}
