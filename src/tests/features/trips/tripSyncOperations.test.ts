import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PendingTripOperation } from 'features/trips/domain/offlineTrips';
import {
  loadTripOutbox,
  loadTripRejections,
  queueTripCreate,
  queueTripUpdate,
  resolveLocalTripId,
  saveTripOutbox,
  saveTripRejections,
} from 'features/trips/services/offlineTripStore';
import { syncPendingTrips } from 'features/trips/services/tripSyncService';
import { ApiError, apiClient } from 'shared/services/apiClient';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const api = jest.mocked(apiClient);
const USER = 'user-1';
const CREATE: PendingTripOperation = {
  kind: 'create',
  clientGeneratedId: 'cg-1',
  payload: {
    mode: 'RIDE',
    occurredOn: '2026-10-24',
    origin: 'Casa',
    destination: 'VetSul',
    cost: 25,
  },
  calculatedCost: 25,
};
const UPDATE: PendingTripOperation = {
  kind: 'update',
  tripId: 'trip-1',
  changes: { origin: 'Hotel' },
};
const DELETE: PendingTripOperation = { kind: 'delete', tripId: 'trip-2' };

beforeEach(async () => {
  [api.post, api.patch, api.delete].forEach(mock => mock.mockReset());
  await AsyncStorage.clear();
});

describe('syncPendingTrips', () => {
  it('has nothing to do with an empty queue', async () => {
    await expect(syncPendingTrips('token', USER)).resolves.toEqual({
      synced: 0,
      rejected: 0,
      pending: 0,
    });
  });

  it('sends each kind of operation to its own route', async () => {
    api.post.mockResolvedValue({ id: 'server-1' });
    await saveTripOutbox(USER, [CREATE, UPDATE, DELETE]);

    await expect(syncPendingTrips('token', USER)).resolves.toMatchObject({
      synced: 3,
    });

    expect(api.patch).toHaveBeenCalledWith(
      '/trips/trip-1',
      { origin: 'Hotel' },
      { token: 'token' },
    );
    expect(api.delete).toHaveBeenCalledWith('/trips/trip-2', {
      token: 'token',
    });
    await expect(resolveLocalTripId(USER, 'local:trip:cg-1')).resolves.toBe(
      'server-1',
    );
  });

  it.each([401, 403, 408, 429, 500])(
    'keeps trying after a %i',
    async status => {
      api.patch.mockRejectedValue(new ApiError('x', null, status));
      await saveTripOutbox(USER, [UPDATE]);

      await expect(syncPendingTrips('token', USER)).resolves.toEqual({
        synced: 0,
        rejected: 0,
        pending: 1,
      });
      await expect(loadTripOutbox(USER)).resolves.toEqual([UPDATE]);
    },
  );

  it('sets a refusal aside and goes on with the rest', async () => {
    const earlier = { operation: UPDATE, code: null };
    await saveTripRejections(USER, [earlier]);
    api.delete.mockRejectedValue(new ApiError('x', 'TRIP_NOT_FOUND', 404));
    await saveTripOutbox(USER, [DELETE, UPDATE]);

    await expect(syncPendingTrips('token', USER)).resolves.toEqual({
      synced: 1,
      rejected: 1,
      pending: 0,
    });

    await expect(loadTripOutbox(USER)).resolves.toEqual([]);
    await expect(loadTripRejections(USER)).resolves.toEqual([
      earlier,
      { operation: DELETE, code: 'TRIP_NOT_FOUND' },
    ]);
  });
});

describe('what the person does while the queue is being sent', () => {
  const LOCAL = 'local:trip:cg-1';

  it('sends a trip registered meanwhile instead of losing it', async () => {
    api.post.mockImplementationOnce(async () => {
      await queueTripCreate(USER, 'cg-2', CREATE.payload, 25);
      return { id: 'server-1' };
    });
    api.post.mockResolvedValueOnce({ id: 'server-2' });
    await saveTripOutbox(USER, [CREATE]);

    await expect(syncPendingTrips('token', USER)).resolves.toMatchObject({
      synced: 2,
      pending: 0,
    });

    expect(api.post).toHaveBeenLastCalledWith(
      '/trips',
      expect.objectContaining({ id: 'cg-2' }),
      { token: 'token' },
    );
    await expect(loadTripOutbox(USER)).resolves.toEqual([]);
  });

  it('keeps a trip registered while the connection was failing', async () => {
    api.post.mockImplementation(async () => {
      if (api.post.mock.calls.length === 1) {
        await queueTripCreate(USER, 'cg-2', CREATE.payload, 25);
      }
      throw new TypeError('Network request failed');
    });
    await saveTripOutbox(USER, [CREATE]);

    await expect(syncPendingTrips('token', USER)).resolves.toMatchObject({
      synced: 0,
      pending: 2,
    });

    await expect(loadTripOutbox(USER)).resolves.toEqual([
      CREATE,
      { ...CREATE, clientGeneratedId: 'cg-2' },
    ]);
  });

  it('sends an edit made to the trip being created', async () => {
    api.post.mockImplementationOnce(async () => {
      await queueTripUpdate(USER, LOCAL, { origin: 'Hotel' }, 25);
      return { id: 'server-1' };
    });
    await saveTripOutbox(USER, [CREATE]);

    await syncPendingTrips('token', USER);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith(
      '/trips/server-1',
      expect.objectContaining({ origin: 'Hotel' }),
      { token: 'token' },
    );
    await expect(loadTripOutbox(USER)).resolves.toEqual([]);
  });

  it('sends again an update edited meanwhile', async () => {
    api.patch.mockImplementationOnce(async () => {
      await queueTripUpdate(USER, 'trip-1', { destination: 'HospVet' });
      return {};
    });
    await saveTripOutbox(USER, [UPDATE]);

    await syncPendingTrips('token', USER);

    expect(api.patch).toHaveBeenLastCalledWith(
      '/trips/trip-1',
      { origin: 'Hotel', destination: 'HospVet' },
      { token: 'token' },
    );
    await expect(loadTripOutbox(USER)).resolves.toEqual([]);
  });

  it('keeps a refused trip that was corrected meanwhile out of the refusals', async () => {
    api.post.mockImplementationOnce(async () => {
      await queueTripUpdate(USER, LOCAL, { origin: 'Hotel' }, 25);
      throw new ApiError('x', 'VALIDATION_ERROR', 400);
    });
    api.post.mockResolvedValueOnce({ id: 'server-1' });
    await saveTripOutbox(USER, [CREATE]);

    await expect(syncPendingTrips('token', USER)).resolves.toEqual({
      synced: 1,
      rejected: 0,
      pending: 0,
    });
    await expect(loadTripRejections(USER)).resolves.toEqual([]);
  });

  it('does not run twice at once', async () => {
    api.post.mockResolvedValue({ id: 'server-1' });
    await saveTripOutbox(USER, [CREATE]);

    await Promise.all([
      syncPendingTrips('token', USER),
      syncPendingTrips('token', USER),
    ]);

    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
