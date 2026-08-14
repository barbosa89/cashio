import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CalendarViewMenuTrigger } from "@/components/calendar-view-menu-trigger";
import type { CalendarViewMenuProps } from "@/components/calendar-view-menu-types";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { CalendarViewMode } from "@/hooks/use-calendar-view-mode";
import { useTranslation } from "@/i18n/localization-provider";

export function CalendarViewMenu({ onChange, value }: CalendarViewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  function select(nextMode: CalendarViewMode) {
    onChange(nextMode);
    setIsOpen(false);
  }

  return (
    <View style={styles.container}>
      <CalendarViewMenuTrigger
        expanded={isOpen}
        onPress={() => setIsOpen((current) => !current)}
        value={value}
      />
      {isOpen ? (
        <ThemedView
          accessibilityLabel={t("calendar.viewMenuTitle")}
          accessibilityRole="menu"
          style={styles.menu}
          type="backgroundElement"
        >
          {(["list", "calendar"] as const).map((mode) => (
            <Pressable
              accessibilityRole="menuitem"
              accessibilityState={{ selected: mode === value }}
              key={mode}
              onPress={() => select(mode)}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.checkSlot}>
                {mode === value ? <ThemedText>✓</ThemedText> : null}
              </View>
              <ThemedText type="smallBold">
                {t(`calendar.views.${mode}`)}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  checkSlot: { alignItems: "center", width: 20 },
  container: { position: "relative", zIndex: 20 },
  menu: {
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    boxShadow: "0 5px 18px rgba(0, 0, 0, 0.22)",
    minWidth: 150,
    paddingVertical: Spacing.one,
    position: "absolute",
    right: 0,
    top: 44,
    zIndex: 21,
  },
  pressed: { opacity: 0.7 },
});
