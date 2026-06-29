import FeatherIcon from 'react-native-vector-icons/Feather';
import type glyphMap from 'react-native-vector-icons/glyphmaps/Feather.json';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type AppIconName = keyof typeof glyphMap | 'bank';

export type AppIconProps = {
  color: string;
  name: AppIconName;
  size?: number;
  style?: React.ComponentProps<typeof FeatherIcon>['style'];
};

export function AppIcon({ color, name, size = 24, style }: AppIconProps) {
  if (name === 'bank') {
    return (
      <Svg
        fill="none"
        height={size}
        style={style as StyleProp<ViewStyle>}
        viewBox="0 0 24 24"
        width={size}
      >
        <Path
          d="M3 10.25h18M5 21h14M6.5 10.25V19M10.17 10.25V19M13.83 10.25V19M17.5 10.25V19M3.75 7.75 12 3l8.25 4.75"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  return <FeatherIcon allowFontScaling={false} color={color} name={name} size={size} style={style} />;
}
