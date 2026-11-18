import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, MIN_SCREEN_BOTTOM, MIN_SCREEN_TOP } from 'app/lib/layout';
import { BackgroundPrimary } from 'theme/colors';

const SLIDE_MS = 300;

type FullScreenModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  /** iOS: o fim da saída; só então outro Modal pode abrir. */
  onDismiss?: () => void;
  children: ReactNode;
};

// A tela cheia entra e sai pela lateral, como as outras telas do app. O
// `animationType="slide"` do Modal sobe de baixo, que é o gesto das folhas.
export function FullScreenModal({
  visible,
  onRequestClose,
  onDismiss,
  children,
}: FullScreenModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  // Fica montado até a saída terminar, senão a tela some sem deslizar.
  const [isRendered, setIsRendered] = useState(visible);

  useEffect(() => {
    if (visible) setIsRendered(true);

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: SLIDE_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !visible) setIsRendered(false);
    });

    return () => animation.stop();
  }, [visible, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}
    >
      <Animated.View style={[layout.fill, { transform: [{ translateX }] }]}>
        <View
          className="flex-1"
          style={{
            paddingTop: Math.max(insets.top, MIN_SCREEN_TOP),
            paddingBottom: Math.max(insets.bottom, MIN_SCREEN_BOTTOM),
          }}
        >
          <LinearGradient
            colors={BackgroundPrimary.colors}
            locations={BackgroundPrimary.locations}
            style={StyleSheet.absoluteFill}
          />
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
