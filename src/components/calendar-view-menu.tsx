import { MenuView, type MenuAction } from "@expo/ui/community/menu";

import { CalendarViewMenuTrigger } from "@/components/calendar-view-menu-trigger";
import type { CalendarViewMenuProps } from "@/components/calendar-view-menu-types";
import { useTranslation } from "@/i18n/localization-provider";

export function CalendarViewMenu(props: CalendarViewMenuProps) {
  const { t } = useTranslation();
  const actions: MenuAction[] = (["list", "calendar"] as const).map(
    (mode) => ({
      id: mode,
      image: mode === "list" ? "list.bullet" : "calendar",
      state: mode === props.value ? "on" : "off",
      title: t(`calendar.views.${mode}`),
    }),
  );

  return (
    <MenuView
      actions={actions}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === "list" || nativeEvent.event === "calendar") {
          props.onChange(nativeEvent.event);
        }
      }}
      title={t("calendar.viewMenuTitle")}
    >
      <CalendarViewMenuTrigger value={props.value} />
    </MenuView>
  );
}
