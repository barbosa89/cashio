import type { CalendarViewMode } from "@/hooks/use-calendar-view-mode";

export type CalendarViewMenuProps = {
  onChange: (mode: CalendarViewMode) => void;
  value: CalendarViewMode;
};
