import * as Network from 'expo-network';
import { Platform } from 'react-native';

const isSupported = Platform.OS !== 'web';

export type ConnectionListener = () => void;

export function onConnectionRestored(listener: ConnectionListener): () => void {
  if (!isSupported) {
    return () => undefined;
  }

  let wasConnected = true;

  Network.getNetworkStateAsync()
    .then(state => {
      wasConnected = state.isInternetReachable ?? state.isConnected ?? false;
    })
    .catch(() => {
      wasConnected = false;
    });

  const subscription = Network.addNetworkStateListener(event => {
    const isConnected = event.isInternetReachable ?? event.isConnected ?? false;

    if (isConnected && !wasConnected) {
      listener();
    }

    wasConnected = isConnected;
  });

  return () => subscription?.remove?.();
}
