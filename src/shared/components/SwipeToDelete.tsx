import { Trash2 } from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { ACTION_WIDTH, resolveSwipeRelease } from 'shared/utils/swipeGesture';

// Horizontal movement needed before the swipe takes over the touch. Below it,
// taps still reach the card's inputs and the list keeps scrolling vertically.
const CLAIM_SLOP = 8;
// How much more horizontal than vertical the drag has to be to count as a swipe.
const HORIZONTAL_BIAS = 1.5;
const SETTLE_MS = 180;
const EXIT_MS = 200;

// Dragging across the card would otherwise start a text selection on web, which
// steals the gesture halfway through. Native platforms have no such notion.
const SWIPE_STYLE = Platform.select({
  web: { userSelect: 'none' } as never,
  default: undefined,
});

type SwipeToDeleteProps = {
  onDelete: () => void;
  /** Accessible name for the delete action. */
  deleteLabel: string;
  children: ReactNode;
};

/**
 * Reveals a delete action when its child is swiped to the left. A long drag or
 * a quick flick removes the row outright; a short one parks it open so the bin
 * can be tapped instead.
 *
 * Built on `PanResponder` rather than a gesture library so it adds no
 * dependency and behaves the same on web, where the flow is reviewed.
 */
export function SwipeToDelete({
  onDelete,
  deleteLabel,
  children,
}: SwipeToDeleteProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  // Where the card rests between gestures, so a second drag continues from the
  // open position instead of jumping back to zero.
  const restingOffset = useRef(0);
  // Held in a ref so the responder below can stay stable across renders:
  // rebuilding it mid-drag (the parent re-renders on every keystroke) would
  // drop the gesture halfway.
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  });

  const panResponder = useMemo(() => {
    const settleTo = (value: number) => {
      restingOffset.current = value;
      Animated.timing(translateX, {
        toValue: value,
        duration: SETTLE_MS,
        useNativeDriver: true,
      }).start();
    };

    const remove = () => {
      restingOffset.current = 0;
      Animated.timing(translateX, {
        toValue: -Dimensions.get('window').width,
        duration: EXIT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDeleteRef.current();
        }
      });
    };

    // Capture phase: the name and quantity fields are responders themselves, so
    // a swipe starting on one of them has to be claimed before it reaches them.
    const shouldCapture = (
      _event: unknown,
      gesture: { dx: number; dy: number },
    ) =>
      Math.abs(gesture.dx) > CLAIM_SLOP &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy) * HORIZONTAL_BIAS;

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: shouldCapture,
      onMoveShouldSetPanResponder: shouldCapture,
      onPanResponderMove: (_event, gesture) => {
        // Clamped at 0: there is nothing to reveal on the right.
        translateX.setValue(Math.min(0, restingOffset.current + gesture.dx));
      },
      onPanResponderRelease: (_event, gesture) => {
        const offset = Math.min(0, restingOffset.current + gesture.dx);
        switch (resolveSwipeRelease(offset, gesture.vx)) {
          case 'delete':
            remove();
            break;
          case 'open':
            settleTo(-ACTION_WIDTH);
            break;
          default:
            settleTo(0);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => settleTo(0),
    });
  }, [translateX]);

  return (
    <View>
      <View style={styles.action} className="rounded-[14px] bg-alert-primary">
        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={deleteLabel}
          onPress={onDelete}
          className="h-full w-full items-center justify-center active:opacity-70"
        >
          <Icon as={Trash2} size={20} className="text-label-secondary" />
        </Pressable>
      </View>

      <Animated.View
        style={[SWIPE_STYLE, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sits behind the card, flush with its right edge; the card covers it while
  // the row is closed.
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
  },
});
