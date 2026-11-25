import React from 'react';
import { Animated } from 'react-native';

// A tab's screen mounts from scratch on every switch; fading it in keeps its
// first paint (spinners, empty states) from popping in.
function ScreenFade({ children }: { children: React.ReactNode }) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View className="flex-1" style={{ opacity }}>
      {children}
    </Animated.View>
  );
}

export { ScreenFade };
