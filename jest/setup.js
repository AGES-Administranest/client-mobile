/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('expo-crypto', () => {
  let counter = 0;

  return {
    randomUUID: jest.fn(() => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
    }),
  };
});
// Animations finish at once: a closed bottom sheet stays mounted until its
// exit animation ends, and tests should see the state after that, the same
// as a user who waits for it.
const { Animated } = require('react-native');
const instant = (value, config) => ({
  start: callback => {
    value.setValue(config.toValue);
    callback?.({ finished: true });
  },
  stop: () => {},
  reset: () => {},
});
Animated.timing = instant;
Animated.spring = instant;
