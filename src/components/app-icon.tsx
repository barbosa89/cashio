import FeatherIcon from 'react-native-vector-icons/Feather';
import type glyphMap from 'react-native-vector-icons/glyphmaps/Feather.json';
import type { StyleProp, ViewStyle } from 'react-native';

import { BankIcon, CashIcon } from '@/components/icons';

export type AppIconName = keyof typeof glyphMap | 'bank' | 'cash';

export type AppIconProps = {
  color: string;
  name: AppIconName;
  size?: number;
  style?: React.ComponentProps<typeof FeatherIcon>['style'];
};

export function AppIcon({ color, name, size = 24, style }: AppIconProps) {
  const svgStyle = style as StyleProp<ViewStyle>;

  if (name === 'bank') {
    return <BankIcon color={color} size={size} style={svgStyle} />;
  }

  if (name === 'cash') {
    return <CashIcon color={color} size={size} style={svgStyle} />;
  }

  return <FeatherIcon allowFontScaling={false} color={color} name={name} size={size} style={style} />;
}
