import * as Network from 'expo-network';
import { Platform } from 'react-native';

import { isOnline } from './network';

const getState = jest.mocked(Network.getNetworkStateAsync);

function stateOf(state: Partial<Network.NetworkState>) {
  getState.mockResolvedValue(state as Network.NetworkState);
}

describe('isOnline', () => {
  it('is true when the internet is reachable', async () => {
    stateOf({ isConnected: true, isInternetReachable: true });

    expect(await isOnline()).toBe(true);
  });

  it('is false when connected to a network with no internet', async () => {
    stateOf({ isConnected: true, isInternetReachable: false });

    expect(await isOnline()).toBe(false);
  });

  it('falls back to the connection when reachability is unknown', async () => {
    stateOf({ isConnected: false, isInternetReachable: undefined });

    expect(await isOnline()).toBe(false);
  });

  it('counts an unknown state as online', async () => {
    stateOf({});

    expect(await isOnline()).toBe(true);
  });

  it('counts a failed reading of the state as online', async () => {
    getState.mockRejectedValue(new Error('unavailable'));

    expect(await isOnline()).toBe(true);
  });

  it('is always true on the web, which has no state to read', async () => {
    const original = Platform.OS;
    jest.resetModules();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      const web = require('./network') as typeof import('./network');
      stateOf({ isConnected: false, isInternetReachable: false });

      expect(await web.isOnline()).toBe(true);
    } finally {
      Object.defineProperty(Platform, 'OS', {
        value: original,
        configurable: true,
      });
    }
  });
});
