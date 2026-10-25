import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadTripOutbox,
  loadTripRejections,
  saveTripOutbox,
  subscribeOfflineTrips,
} from './offlineTripStore';
import { syncPendingTrips } from './tripSyncService';
import type { PendingTripOperation } from '../domain/offlineTrips';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const post = apiClient.post as jest.Mock;

const USER = 'user-1';
const CREATE: PendingTripOperation = {
  kind: 'create',
  clientGeneratedId: 'cg-1',
  payload: {
    mode: 'RIDE',
    occurredOn: '2026-10-24',
    origin: 'Casa',
    destination: 'Hospital Vet Sul',
    cost: 25.5,
  },
  calculatedCost: 25.5,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await saveTripOutbox(USER, [CREATE]);
});

it('sends each pending trip on its own, never to /trips/sync', async () => {
  post.mockResolvedValue({ id: 'server-1' });

  const result = await syncPendingTrips('token', USER);

  expect(result).toEqual({ synced: 1, rejected: 0, pending: 0 });
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith(
    '/trips',
    expect.objectContaining({ id: 'cg-1' }),
    { token: 'token' },
  );
  await expect(loadTripOutbox(USER)).resolves.toEqual([]);
});

it('keeps the trip and announces nothing when the network is down', async () => {
  post.mockRejectedValue(new TypeError('Failed to fetch'));
  const listener = jest.fn();
  const unsubscribe = subscribeOfflineTrips(listener);

  const result = await syncPendingTrips('token', USER);
  unsubscribe();

  expect(result).toEqual({ synced: 0, rejected: 0, pending: 1 });
  expect(listener).not.toHaveBeenCalled();
  await expect(loadTripOutbox(USER)).resolves.toEqual([CREATE]);
});

it('moves a trip the API refuses to the rejections and announces it', async () => {
  post.mockRejectedValue(
    new ApiError('invalid', 'TRIP_MODE_FIELDS_INVALID', 400),
  );
  const listener = jest.fn();
  const unsubscribe = subscribeOfflineTrips(listener);

  const result = await syncPendingTrips('token', USER);
  unsubscribe();

  expect(result).toEqual({ synced: 0, rejected: 1, pending: 0 });
  expect(listener).toHaveBeenCalledTimes(1);
  await expect(loadTripRejections(USER)).resolves.toEqual([
    { operation: CREATE, code: 'TRIP_MODE_FIELDS_INVALID' },
  ]);
});
