import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppPalette } from "@/constants/theme";

type CashioLogoProps = {
  height?: number;
  style?: StyleProp<ViewStyle>;
  width?: number;
};

export function CashioLogo({
  height = 64,
  style,
  width = 180,
}: CashioLogoProps) {
  const radius = Math.round(height * 0.16);

  return (
    <View
      accessibilityLabel="Cash IO"
      accessibilityRole="image"
      style={[
        styles.container,
        {
          borderRadius: radius,
          height,
          width,
        },
        style,
      ]}
    >
      <View
        style={[styles.cashPanel, { backgroundColor: AppPalette.brandOrange }]}
      >
        <ThemedText
          numberOfLines={1}
          style={[
            styles.cashText,
            {
              color: "#000000",
              fontSize: Math.round(height * 0.44),
              lineHeight: Math.round(height * 0.5),
            },
          ]}
        >
          Cash
        </ThemedText>
      </View>

      <View style={styles.ioPanel}>
        <ThemedText
          numberOfLines={1}
          style={[
            styles.ioText,
            {
              color: AppPalette.brandOrange,
              fontSize: Math.round(height * 0.44),
              lineHeight: Math.round(height * 0.5),
            },
          ]}
        >
          IO
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    borderColor: "#1f1f1f",
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  cashPanel: {
    alignItems: "center",
    flex: 1.28,
    justifyContent: "center",
  },
  cashText: {
    fontWeight: "400",
    letterSpacing: 0,
  },
  ioPanel: {
    alignItems: "center",
    backgroundColor: "#000000",
    flex: 1,
    justifyContent: "center",
  },
  ioText: {
    fontWeight: "400",
    letterSpacing: 0,
  },
});
