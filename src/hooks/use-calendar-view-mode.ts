import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

export type CalendarViewMode = "calendar" | "list";

const CALENDAR_VIEW_MODE_KEY = "cashio.calendar.view-mode.v1";

export function parseCalendarViewMode(value: string | null): CalendarViewMode {
  return value === "calendar" || value === "list" ? value : "list";
}

export async function loadCalendarViewMode() {
  return parseCalendarViewMode(
    await AsyncStorage.getItem(CALENDAR_VIEW_MODE_KEY),
  );
}

export async function saveCalendarViewMode(value: CalendarViewMode) {
  await AsyncStorage.setItem(CALENDAR_VIEW_MODE_KEY, value);
}

export function useCalendarViewMode() {
  const [viewMode, setViewModeState] = useState<CalendarViewMode>("list");
  const changedByUser = useRef(false);

  useEffect(() => {
    let isMounted = true;
    void loadCalendarViewMode()
      .then((storedMode) => {
        if (isMounted && !changedByUser.current) {
          setViewModeState(storedMode);
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  const setViewMode = useCallback((nextMode: CalendarViewMode) => {
    changedByUser.current = true;
    setViewModeState(nextMode);
    void saveCalendarViewMode(nextMode).catch(() => undefined);
  }, []);

  return { setViewMode, viewMode };
}
