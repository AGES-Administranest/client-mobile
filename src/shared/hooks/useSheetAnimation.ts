import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const OPEN_MS = 240;
const CLOSE_MS = 180;

type SheetAnimation = {
  isRendered: boolean;
  progress: Animated.Value;
  translateY: Animated.AnimatedInterpolation<string>;
};

/**
 * Slides a bottom sheet in while its backdrop fades on its own.
 *
 * `Modal`'s `animationType="slide"` translates the whole modal content,
 * backdrop included, so the dim layer travels up with the sheet instead of
 * covering the screen from the first frame.
 */
export function useSheetAnimation(visible: boolean): SheetAnimation {
  const progress = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
    }

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? OPEN_MS : CLOSE_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      // A percentage translation is resolved from layout, which the native
      // driver cannot read.
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      // Unmount only after the exit finishes, or the sheet pops away.
      if (finished && !visible) {
        setIsRendered(false);
      }
    });

    return () => animation.stop();
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    // Its own height, so it starts just offscreen without measuring first.
    outputRange: ['100%', '0%'],
  });

  return { isRendered, progress, translateY };
}
