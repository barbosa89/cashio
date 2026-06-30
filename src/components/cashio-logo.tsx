import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";

const APP_LABEL = "Cash IO";

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
  const iconSize = Math.round(height * 1.1);
  const iconOffset = Math.round(height * -0.13);
  const gap = Math.round(height * 0.2);
  const fontSize = Math.round(height * 0.46);

  return (
    <View
      accessibilityLabel={APP_LABEL}
      accessibilityRole="image"
      style={[
        styles.container,
        {
          height,
          width,
        },
        style,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        contentFit="contain"
        source={require("@/assets/images/android-icon-foreground.png")}
        style={[
          styles.icon,
          {
            height: iconSize,
            marginLeft: iconOffset,
            marginRight: iconOffset + gap,
            width: iconSize,
          },
        ]}
      />

      <ThemedText
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[
          styles.label,
          {
            fontSize,
            lineHeight: Math.round(fontSize * 1.1),
          },
        ]}
      >
        {APP_LABEL}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    overflow: "visible",
  },
  icon: {
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
