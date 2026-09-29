import * as Network from 'expo-network';

import { onConnectionRestored } from 'shared/services/network';

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

const addListenerMock = Network.addNetworkStateListener as jest.MockedFunction<
  typeof Network.addNetworkStateListener
>;
const getStateMock = Network.getNetworkStateAsync as jest.MockedFunction<
  typeof Network.getNetworkStateAsync
>;

type Emit = (event: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}) => void;

function listen(startsConnected: boolean) {
  let emit: Emit = () => undefined;
  const remove = jest.fn();

  getStateMock.mockResolvedValue({
    isConnected: startsConnected,
    isInternetReachable: startsConnected,
  } as never);

  addListenerMock.mockImplementation(((listener: Emit) => {
    emit = listener;
    return { remove };
  }) as never);

  const listener = jest.fn();
  const stop = onConnectionRestored(listener);

  return {
    listener,
    emit: (...args: Parameters<Emit>) => emit(...args),
    stop,
    remove,
  };
}

beforeEach(() => jest.clearAllMocks());

it('calls back when the connection comes back', async () => {
  const { listener, emit } = listen(false);
  await Promise.resolve();

  emit({ isInternetReachable: true });

  expect(listener).toHaveBeenCalledTimes(1);
});

it('sees the reconnection even when the app opened offline', async () => {
  const { listener, emit } = listen(false);
  await Promise.resolve();

  emit({ isInternetReachable: true });

  expect(listener).toHaveBeenCalled();
});

it('stays quiet while the connection never dropped', async () => {
  const { listener, emit } = listen(true);
  await Promise.resolve();

  emit({ isInternetReachable: true });
  emit({ isInternetReachable: true });

  expect(listener).not.toHaveBeenCalled();
});

it('stays quiet when the connection drops', async () => {
  const { listener, emit } = listen(true);
  await Promise.resolve();

  emit({ isInternetReachable: false });

  expect(listener).not.toHaveBeenCalled();
});

it('calls back once per reconnection, not per event', async () => {
  const { listener, emit } = listen(true);
  await Promise.resolve();

  emit({ isInternetReachable: false });
  emit({ isInternetReachable: true });
  emit({ isInternetReachable: true });

  expect(listener).toHaveBeenCalledTimes(1);
});

it('stops listening when told to', async () => {
  const { stop, remove } = listen(true);
  await Promise.resolve();

  stop();

  expect(remove).toHaveBeenCalled();
});
