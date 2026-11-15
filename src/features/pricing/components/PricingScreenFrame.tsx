import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { BackgroundPrimary } from 'theme/colors';

// Browsers report no top inset, which left the back button on the edge.
const MIN_TOP_PADDING = 16;

const styles = StyleSheet.create({ fill: { flex: 1 } });

export type PricingScreenFrameProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

export function PricingScreenFrame({
  visible,
  onRequestClose,
  children,
}: PricingScreenFrameProps) {
  const insets = useSafeAreaInsets();

  return (
    <SlideInModal visible={visible} onRequestClose={onRequestClose}>
      <View
        style={[
          styles.fill,
          {
            paddingTop: Math.max(insets.top, MIN_TOP_PADDING),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </SlideInModal>
  );
}
