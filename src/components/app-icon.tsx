import FeatherIcon from 'react-native-vector-icons/Feather';
import type glyphMap from 'react-native-vector-icons/glyphmaps/Feather.json';

export type AppIconName = keyof typeof glyphMap;

export type AppIconProps = {
  color: string;
  name: AppIconName;
  size?: number;
  style?: React.ComponentProps<typeof FeatherIcon>['style'];
};

export function AppIcon({ color, name, size = 24, style }: AppIconProps) {
  return <FeatherIcon allowFontScaling={false} color={color} name={name} size={size} style={style} />;
}
