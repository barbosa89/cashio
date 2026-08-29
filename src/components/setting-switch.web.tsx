import { Pressable, StyleSheet, View } from "react-native";

import { AppPalette, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SettingSwitchProps = {
  accessibilityLabel: string;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function SettingSwitch({
  accessibilityLabel,
  disabled,
  onValueChange,
  value,
}: Readonly<SettingSwitchProps>) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.control,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: value
              ? AppPalette.brandOrange
              : theme.backgroundSelected,
            justifyContent: value ? "flex-end" : "flex-start",
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: value
                ? AppPalette.foregroundOnBrand
                : AppPalette.foregroundInverse,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 52,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    borderRadius: 14,
    height: 28,
    width: 28,
  },
  track: {
    borderRadius: Spacing.three,
    flexDirection: "row",
    height: 32,
    padding: Spacing.half,
    width: 52,
  },
});
