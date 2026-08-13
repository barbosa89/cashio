import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/localization-provider";

type MonthNavigationProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  contextLabel: string;
  monthLabel: string;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

export function MonthNavigation({
  canGoNext,
  canGoPrevious,
  contextLabel,
  monthLabel,
  onNextMonth,
  onPreviousMonth,
}: Readonly<MonthNavigationProps>) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.navigationRow}>
        <MonthButton
          disabled={!canGoNext}
          icon="chevron-left"
          label={t("accessibility.nextMonth")}
          onPress={onNextMonth}
        />

        <View style={styles.labels}>
          <ThemedText selectable type="smallBold" style={styles.monthLabel}>
            {monthLabel}
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            selectable
            type="small"
            themeColor="textSecondary"
            style={styles.contextLabel}
          >
            {contextLabel}
          </ThemedText>
        </View>

        <MonthButton
          disabled={!canGoPrevious}
          icon="chevron-right"
          label={t("accessibility.previousMonth")}
          onPress={onPreviousMonth}
        />
      </View>
    </View>
  );
}

export function MonthChangeToast({
  monthKey,
  monthLabel,
}: Readonly<{ monthKey: string; monthLabel: string }>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const previousMonthKey = useRef(monthKey);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (previousMonthKey.current === monthKey) {
      return;
    }

    previousMonthKey.current = monthKey;
    setNotice(t("dashboard.monthChanged", { month: monthLabel }));

    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
    }

    noticeTimeout.current = setTimeout(() => {
      noticeTimeout.current = null;
      setNotice(null);
    }, 2000);
  }, [monthKey, monthLabel, t]);

  useEffect(
    () => () => {
      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
      }
    },
    [],
  );

  return (
    <View pointerEvents="none" style={styles.toastOverlay}>
      {notice ? (
        <Animated.View
          key={monthKey}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(180)}
        >
          <ThemedView type="backgroundElement" style={styles.toast}>
            <AppIcon color={theme.text} name="calendar" size={16} />
            <ThemedText type="smallBold" style={styles.toastText}>
              {notice}
            </ThemedText>
          </ThemedView>
        </Animated.View>
      ) : null}
    </View>
  );
}

function MonthButton({
  disabled,
  icon,
  label,
  onPress,
}: Readonly<{
  disabled: boolean;
  icon: AppIconName;
  label: string;
  onPress: () => void;
}>) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonPressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView
        type="backgroundElement"
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <AppIcon
          color={disabled ? theme.textSecondary : theme.text}
          name={icon}
          size={28}
        />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressable: {
    borderRadius: Spacing.two,
  },
  container: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  contextLabel: {
    textAlign: "center",
  },
  labels: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
    paddingHorizontal: Spacing.two,
  },
  monthLabel: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  navigationRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.7,
  },
  toast: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Spacing.two,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
    flexDirection: "row",
    gap: Spacing.two,
    maxWidth: 360,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toastOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: Spacing.three,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  toastText: {
    flexShrink: 1,
  },
});
