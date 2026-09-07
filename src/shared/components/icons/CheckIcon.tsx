import Svg, { Path } from 'react-native-svg';

import type { IconProps } from './types';

// Vector data exported from Figma (Icon / check, node 31:1060), 16x16.
export function CheckIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M12.9798 3.64648C13.1751 3.45122 13.4916 3.45122 13.6868 3.64648C13.8821 3.84175 13.8821 4.15825 13.6868 4.35352L6.35352 11.6868C6.15825 11.8821 5.84175 11.8821 5.64648 11.6868L2.31315 8.35352C2.11789 8.15825 2.11789 7.84175 2.31315 7.64648C2.50841 7.45122 2.82492 7.45122 3.02018 7.64648L6 10.6263L12.9798 3.64648Z"
        fill={color}
      />
    </Svg>
  );
}
