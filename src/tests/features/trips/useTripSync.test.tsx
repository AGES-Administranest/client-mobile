import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { act } from 'react-test-renderer';

import { useTripSync } from 'features/trips/hooks/useTripSync';
import {
  loadTripOutbox,
  loadTripRejections,
  notifyOfflineTripsChanged,
  saveTripOutbox,
  saveTripRejections,
} from 'features/trips/services/offlineTripStore';
import { syncPendingTrips } from 'features/trips/services/tripSyncService';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' } as { id: string } | null,
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/trips/services/tripSyncService', () => ({
  syncPendingTrips: jest.fn(),
}));

const sync = jest.mocked(syncPendingTrips);
const DONE = { synced: 0, rejected: 0, pending: 0 };
const rejection = (tripId: string) => ({
  operation: { kind: 'delete' as const, tripId },
  code: 'TRIP_NOT_FOUND',
});

let onAppState: (state: string) => void;
const removeAppState = jest.fn();

beforeEach(async () => {
  sync.mockReset().mockResolvedValue(DONE);
  removeAppState.mockReset();
  mockAuth.session = { idToken: 'token' };
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      onAppState = listener as (state: string) => void;
      return { remove: removeAppState } as never;
    });
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const settle = () => act(async () => {});

describe('useTripSync', () => {
  it('sends what is pending when the app opens', async () => {
    await renderHook(useTripSync);

    expect(sync).toHaveBeenCalledWith('token', 'user-1');
  });

  it('does nothing without a session', async () => {
    mockAuth.session = null;

    const hook = await renderHook(useTripSync);
    await act(async () => hook.current.syncNow());

    expect(sync).not.toHaveBeenCalled();
    expect(hook.current.rejection).toBeNull();
  });

  it('tries again when the app comes back, not when it leaves', async () => {
    await renderHook(useTripSync);

    await act(async () => onAppState('background'));
    expect(sync).toHaveBeenCalledTimes(1);

    await act(async () => onAppState('active'));
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('tries again when something enters the queue', async () => {
    await renderHook(useTripSync);

    await act(async () => notifyOfflineTripsChanged());

    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('never runs two syncs at once', async () => {
    let finish!: () => void;
    sync.mockReturnValueOnce(
      new Promise(resolve => {
        finish = () => resolve(DONE);
      }),
    );
    await renderHook(useTripSync);

    await act(async () => onAppState('active'));
    expect(sync).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await act(async () => onAppState('active'));
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('retries every 30 seconds only while something is pending', async () => {
    jest.useFakeTimers();
    await renderHook(useTripSync);
    const halfMinute = async () => {
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      await settle();
    };

    await halfMinute();
    expect(sync).toHaveBeenCalledTimes(1);

    await saveTripOutbox('user-1', [{ kind: 'delete', tripId: 'trip-1' }]);
    await halfMinute();
    expect(sync).toHaveBeenCalledTimes(2);
    await expect(loadTripOutbox('user-1')).resolves.toHaveLength(1);
  });

  it('shows the refusals one at a time, until each is dismissed', async () => {
    await saveTripRejections('user-1', [rejection('a'), rejection('b')]);
    const hook = await renderHook(useTripSync);
    expect(hook.current.rejection).toEqual(rejection('a'));

    await act(async () => hook.current.dismissRejection());
    expect(hook.current.rejection).toEqual(rejection('b'));
    await expect(loadTripRejections('user-1')).resolves.toEqual([
      rejection('b'),
    ]);

    await act(async () => hook.current.dismissRejection());
    expect(hook.current.rejection).toBeNull();
  });

  it('still shows the refusals when the sync itself fails', async () => {
    await saveTripRejections('user-1', [rejection('a')]);
    sync.mockRejectedValue(new Error('unexpected'));

    const hook = await renderHook(useTripSync);

    expect(hook.current.rejection).toEqual(rejection('a'));
  });

  it('stops everything when it is gone', async () => {
    const hook = await renderHook(useTripSync);

    hook.unmount();
    notifyOfflineTripsChanged();

    expect(removeAppState).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
