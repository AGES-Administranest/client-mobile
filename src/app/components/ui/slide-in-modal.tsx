import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { BackgroundPrimary } from 'theme/colors';

const SLIDE_MS = 280;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BackgroundPrimary.colors[1] },
});

type SlideInModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * A full-screen view that is pushed in from the right and leaves to the
 * right. A Modal's own "slide" always rises from and falls to the bottom, so
 * the Modal stays mounted, transparent, until the exit has run.
 */
export function SlideInModal({
  visible,
  onRequestClose,
  children,
}: SlideInModalProps) {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const offset = useRef(new Animated.Value(visible ? 0 : width)).current;

  useEffect(() => {
    const animation = Animated.timing(offset, {
      toValue: visible ? 0 : width,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    if (visible) {
      setMounted(true);
      offset.setValue(width);
    }
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, width, offset]);

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {/* style, not className: Animated.View does not take NativeWind's. */}
      <Animated.View
        style={[styles.screen, { transform: [{ translateX: offset }] }]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}
