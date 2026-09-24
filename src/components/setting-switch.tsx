import { Switch } from "react-native";

import { AppPalette } from "@/constants/theme";
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
    <Switch
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      ios_backgroundColor={theme.surfaceMuted}
      onValueChange={onValueChange}
      thumbColor={
        value ? AppPalette.foregroundOnBrand : AppPalette.foregroundInverse
      }
      trackColor={{
        false: theme.surfaceMuted,
        true: AppPalette.brandOrange,
      }}
      value={value}
    />
  );
}
