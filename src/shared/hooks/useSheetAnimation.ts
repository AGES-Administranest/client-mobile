import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

const OPEN_MS = 240;
const CLOSE_MS = 180;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 1;
// The grab handle and the title: dragging there closes the sheet. Below it,
// a downward drag stays with the content (it scrolls lists up).
const DRAG_ZONE_HEIGHT = 80;

type SheetAnimation = {
  isRendered: boolean;
  progress: Animated.Value;
  sheetStyle: {
    userSelect: 'none';
    transform: [
      { translateY: Animated.AnimatedInterpolation<string> },
      { translateY: Animated.Value },
    ];
  };
  /** Spread on the sheet itself: gesture handlers plus the layout probe. */
  panHandlers: GestureResponderHandlers & {
    onLayout: (event: LayoutChangeEvent) => void;
  };
};

/**
 * Slides a bottom sheet in while its backdrop fades on its own, and lets it be
 * dragged down to close.
 *
 * `Modal`'s `animationType="slide"` translates the whole modal content,
 * backdrop included, so the dim layer travels up with the sheet instead of
 * covering the screen from the first frame.
 */
export function useSheetAnimation(
  visible: boolean,
  onClose?: () => void,
  /**
   * Runs once the exit animation ends and the modal is gone. On iOS a Modal
   * cannot be presented while another one is still leaving, so a sheet that
   * opens another sheet should wait for this instead of opening it at once.
   */
  onClosed?: () => void,
): SheetAnimation {
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(visible);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const wasOpenRef = useRef(visible);
  const sheetTop = useRef(0);

  useEffect(() => {
    if (visible) {
      dragY.setValue(0);
      setIsRendered(true);
      wasOpenRef.current = true;
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
        // Mounting closed also "finishes" an exit; only a real close counts.
        if (wasOpenRef.current) {
          wasOpenRef.current = false;
          onClosedRef.current?.();
        }
      }
    });

    return () => animation.stop();
  }, [visible, progress, dragY]);

  const panHandlers = useMemo(() => {
    const settle = () =>
      Animated.spring(dragY, {
        toValue: 0,
        bounciness: 0,
        useNativeDriver: false,
      }).start();

    // Only a downward, mostly vertical drag that starts at the top of the
    // sheet: taps and other gestures still reach what is inside.
    const isDismissDrag = (gesture: PanResponderGestureState) =>
      gesture.dy > 6 &&
      Math.abs(gesture.dy) > Math.abs(gesture.dx) &&
      gesture.y0 - sheetTop.current < DRAG_ZONE_HEIGHT;

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => isDismissDrag(gesture),
      // Capture: the sheet's content is a Pressable that already holds the
      // touch, so a bubbling handler would never get the drag.
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        isDismissDrag(gesture),
      onPanResponderMove: (_event, gesture) =>
        dragY.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        const dismiss =
          gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY;
        if (!dismiss || !onCloseRef.current) {
          settle();
          return;
        }
        onCloseRef.current();
        // The owner may refuse to close (e.g. while saving): put it back.
        requestAnimationFrame(() => {
          if (visibleRef.current) {
            settle();
          }
        });
      },
      onPanResponderTerminate: settle,
    }).panHandlers;
  }, [dragY]);

  const onLayout = (event: LayoutChangeEvent) => {
    // The sheet sits in a full-screen modal, so its layout y is its top on
    // the screen, the same frame as the gesture's y0.
    sheetTop.current = event.nativeEvent.layout.y;
  };

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    // Its own height, so it starts just offscreen without measuring first.
    outputRange: ['100%', '0%'],
  });

  return {
    isRendered,
    progress,
    // Two translations add up: the exit carries on from wherever the finger
    // let go instead of jumping back first.
    sheetStyle: {
      // On the web a mouse drag would select text instead, and a live
      // selection makes react-native-web drop the gesture.
      userSelect: 'none',
      transform: [{ translateY }, { translateY: dragY }],
    },
    panHandlers: { ...panHandlers, onLayout },
  };
}
