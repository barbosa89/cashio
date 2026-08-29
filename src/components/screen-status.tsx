import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

type ScreenStatusProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
};

export function ScreenStatus({
  actionLabel,
  message,
  onAction,
}: Readonly<ScreenStatusProps>) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText accessibilityRole="alert" type="smallBold" themeColor="textSecondary">
        {message}
      </ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold">{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  action: {
    borderRadius: Spacing.two,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  container: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.three,
    justifyContent: "center",
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
