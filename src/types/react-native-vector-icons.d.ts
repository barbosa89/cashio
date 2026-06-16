declare module 'react-native-vector-icons/Feather' {
  import type { ComponentType } from 'react';
  import type { TextStyle, StyleProp } from 'react-native';

  export type FeatherIconProps = {
    allowFontScaling?: boolean;
    color?: string;
    name: string;
    size?: number;
    style?: StyleProp<TextStyle>;
  };

  const FeatherIcon: ComponentType<FeatherIconProps>;
  export default FeatherIcon;
}
