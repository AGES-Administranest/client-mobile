import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';

import { BackgroundPrimary } from '../../../theme/colors';

function ScreenBackground({ children }: PropsWithChildren) {
  return (
    <LinearGradient
      colors={BackgroundPrimary.colors}
      locations={BackgroundPrimary.locations}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

export { ScreenBackground };
