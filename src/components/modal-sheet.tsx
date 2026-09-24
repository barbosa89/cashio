import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ModalSheetProps = {
  children: ReactNode;
  closeLabel: string;
  isVisible: boolean;
  onClose: () => void;
  subtitle?: string;
  title: string;
};

export function ModalSheet({
  children,
  closeLabel,
  isVisible,
  onClose,
  subtitle,
  title,
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <Pressable
        style={[
          styles.backdrop,
          { paddingTop: Math.max(insets.top + Spacing.two, Spacing.six) },
        ]}
        onPress={onClose}
      >
        <Pressable style={styles.frame} onPress={(event) => event.stopPropagation()}>
          <ThemedView
            type="surfaceRaised"
            style={[styles.panel, { borderColor: theme.border }]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <ThemedText type="subtitle" style={styles.title}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel={closeLabel}
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView type="surfaceMuted" style={styles.closeButton}>
                  <AppIcon color={theme.text} name="x" size={22} />
                </ThemedView>
              </Pressable>
            </View>
            {children}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "flex-start",
    padding: Spacing.three,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: Radius.control,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  frame: {
    alignSelf: "center",
    maxHeight: "100%",
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  panel: {
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: Spacing.three,
    maxHeight: "100%",
    overflow: "hidden",
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
});
