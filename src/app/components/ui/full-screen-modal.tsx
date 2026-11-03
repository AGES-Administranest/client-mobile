import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackgroundPrimary } from 'theme/colors';

type FullScreenModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  /** iOS: o fim da saída; só então outro Modal pode abrir. */
  onDismiss?: () => void;
  children: ReactNode;
};

export function FullScreenModal({
  visible,
  onRequestClose,
  onDismiss,
  children,
}: FullScreenModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </Modal>
  );
}
