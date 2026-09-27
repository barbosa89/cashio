import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
} from "react-native-reanimated";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/localization-provider";

const SKELETON_DELAY_MS = 180;
const SKELETON_ROWS = [
  { amount: 112, description: 164, metadata: 92 },
  { amount: 136, description: 132, metadata: 116 },
  { amount: 96, description: 184, metadata: 104 },
  { amount: 124, description: 148, metadata: 84 },
  { amount: 104, description: 176, metadata: 112 },
] as const;

const PULSE_KEYFRAMES = {
  from: { opacity: 0.55 },
  to: { opacity: 0.9 },
} satisfies CSSAnimationKeyframes;

const PULSE_STYLE = {
  animationDirection: "alternate",
  animationDuration: "900ms",
  animationIterationCount: "infinite",
  animationName: PULSE_KEYFRAMES,
  animationTimingFunction: "ease-in-out",
} as const;

export function TransactionListSkeleton() {
  const theme = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [hasReachedDelay, setHasReachedDelay] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setHasReachedDelay(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (!hasReachedDelay) {
    return null;
  }

  return (
    <View
      accessible
      accessibilityLabel={t("common.loading")}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.rows, reduceMotion ? styles.staticPulse : PULSE_STYLE]}
      >
        {SKELETON_ROWS.map((row, index) => (
          <View
            key={row.amount}
            style={[styles.row, { borderBottomColor: theme.border }]}
          >
            <View style={styles.body}>
              <View
                style={[
                  styles.amount,
                  { backgroundColor: theme.surfaceMuted, width: row.amount },
                ]}
              />
              <View
                style={[
                  styles.metadata,
                  { backgroundColor: theme.surfaceMuted, width: row.metadata },
                ]}
              />
              <View
                style={[
                  styles.description,
                  { backgroundColor: theme.surfaceMuted, width: row.description },
                ]}
              />
            </View>
            <View
              style={[
                styles.date,
                {
                  backgroundColor: theme.surfaceMuted,
                  opacity: index % 2 === 0 ? 1 : 0.78,
                },
              ]}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    borderRadius: 6,
    height: 20,
  },
  body: {
    flex: 1,
    gap: Spacing.two,
  },
  container: {
    width: "100%",
  },
  date: {
    borderRadius: 4,
    height: 10,
    marginTop: Spacing.one,
    width: 52,
  },
  description: {
    borderRadius: 4,
    height: 10,
    maxWidth: "82%",
  },
  metadata: {
    borderRadius: 4,
    height: 10,
    maxWidth: "64%",
  },
  row: {
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 88,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.three,
  },
  rows: {
    width: "100%",
  },
  staticPulse: {
    opacity: 0.72,
  },
});
