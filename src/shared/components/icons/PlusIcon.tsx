import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// Vector data exported from Figma (Icon / plus, node 31:123), 16x16.
export function PlusIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 3.33333V12.6667M3.33333 8H12.6667"
        stroke={color}
        strokeWidth={1.33333}
        strokeLinecap="round"
      />
    </Svg>
  );
}
