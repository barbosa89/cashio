import { Pressable, StyleSheet } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { CalendarViewMode } from "@/hooks/use-calendar-view-mode";
import { useTranslation } from "@/i18n/localization-provider";

export function CalendarViewMenuTrigger({
  expanded,
  onPress,
  value,
}: {
  expanded?: boolean;
  onPress?: () => void;
  value: CalendarViewMode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const currentLabel = t(`calendar.views.${value}`);

  return (
    <Pressable
      accessibilityLabel={t("accessibility.changeCalendarView", {
        view: currentLabel,
      })}
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
    >
      <AppIcon
        color={theme.text}
        name={value === "list" ? "list" : "calendar"}
        size={22}
      />
      <AppIcon color={theme.textSecondary} name="chevron-down" size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  trigger: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
    height: 48,
    justifyContent: "center",
    width: 54,
  },
});
