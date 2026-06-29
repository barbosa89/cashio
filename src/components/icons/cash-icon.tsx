import Svg, { Path } from "react-native-svg";

import type { SvgIconProps } from "./icon-props";

export function CashIcon({ color, size, style }: SvgIconProps) {
  return (
    <Svg
      fill="none"
      height={size}
      style={style}
      viewBox="0 0 24 24"
      width={size}
    >
      <Path
        d="M3.5 7.5h17v9h-17z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M7 7.5a3.5 3.5 0 0 1-3.5 3.5M17 7.5a3.5 3.5 0 0 0 3.5 3.5M7 16.5A3.5 3.5 0 0 0 3.5 13M17 16.5a3.5 3.5 0 0 1 3.5-3.5"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Path
        d="M12 14.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}
