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

const CLAIM_SLOP = 8;
const HORIZONTAL_BIAS = 1.5;
const SETTLE_MS = 180;
const EXIT_MS = 200;

const SWIPE_STYLE = Platform.select({
  web: { userSelect: 'none' } as never,
  default: undefined,
});

type SwipeToDeleteProps = {
  onDelete: () => void;
  deleteLabel: string;
  children: ReactNode;
};

export function SwipeToDelete({
  onDelete,
  deleteLabel,
  children,
}: SwipeToDeleteProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const restingOffset = useRef(0);
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
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
  },
});
