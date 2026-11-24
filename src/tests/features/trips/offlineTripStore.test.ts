import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from 'features/trips/domain/trip.types';
import {
  findOfflineTrip,
  loadTripCache,
  loadTripOutbox,
  loadTripRejections,
  loadTripsWithOffline,
  newTripClientGeneratedId,
  queueTripCreate,
  queueTripDelete,
  queueTripUpdate,
  resolveLocalTripId,
  saveResolvedTripId,
  saveTripCache,
  saveTripRejections,
  subscribeOfflineTrips,
} from 'features/trips/services/offlineTripStore';

const USER = 'user-1';
const LOCAL = 'local:trip:cg-1';
const payload = {
  mode: 'RIDE' as const,
  occurredOn: '2026-10-10',
  origin: 'Casa',
  destination: 'Clínica',
  cost: 25,
};
const cached: Trip = {
  ...payload,
  id: 'trip-1',
  vehicleId: null,
  appointmentId: null,
  clientId: null,
  distanceKm: null,
  cost: '25',
};

beforeEach(() => AsyncStorage.clear());

describe('offlineTripStore', () => {
  it('keeps the data of each user apart', async () => {
    await saveTripCache(USER, [cached]);
    await queueTripCreate(USER, 'cg-1', payload, 25);

    await expect(loadTripCache('user-2')).resolves.toEqual([]);
    await expect(loadTripOutbox('user-2')).resolves.toEqual([]);
  });

  it('starts empty when what is stored cannot be read', async () => {
    await saveTripCache(USER, [cached]);
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('{broken');

    await expect(loadTripCache(USER)).resolves.toEqual([]);
  });

  it('goes on without a cache when it cannot be written', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));

    await expect(saveTripCache(USER, [cached])).resolves.toBeUndefined();
  });

  it('but tells when a queued trip could not be written', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));

    await expect(queueTripCreate(USER, 'cg-1', payload, 25)).rejects.toThrow(
      'full',
    );
  });

  it('gives each trip an id of its own', () => {
    expect(newTripClientGeneratedId()).not.toBe(newTripClientGeneratedId());
  });

  it('tells whoever is listening about each change in the queue', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeOfflineTrips(listener);

    await queueTripCreate(USER, 'cg-1', payload, 25);
    await queueTripUpdate(USER, 'trip-1', { origin: 'Hotel' });
    await queueTripDelete(USER, 'trip-1');
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await queueTripDelete(USER, 'trip-2');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('saves and reads back the refusals', async () => {
    const refusals = [
      { operation: { kind: 'delete' as const, tripId: 'trip-1' }, code: null },
    ];

    await saveTripRejections(USER, refusals);

    await expect(loadTripRejections(USER)).resolves.toEqual(refusals);
  });

  describe('a trip created offline', () => {
    it('is edited inside its own create while it is in the queue', async () => {
      await queueTripCreate(USER, 'cg-1', payload, 25);

      await queueTripUpdate(USER, LOCAL, { origin: 'Hotel' }, 30);

      await expect(loadTripOutbox(USER)).resolves.toEqual([
        {
          kind: 'create',
          clientGeneratedId: 'cg-1',
          payload: { ...payload, origin: 'Hotel' },
          calculatedCost: 30,
        },
      ]);
    });

    it('leaves the queue when it is deleted there', async () => {
      await queueTripCreate(USER, 'cg-1', payload, 25);

      await queueTripDelete(USER, LOCAL);

      await expect(loadTripOutbox(USER)).resolves.toEqual([]);
    });

    it('is changed by its real id once it was sent', async () => {
      await saveResolvedTripId(USER, 'cg-1', 'trip-1');
      await saveResolvedTripId(USER, 'cg-2', 'trip-2');

      await queueTripUpdate(USER, LOCAL, { origin: 'Hotel' });
      await queueTripDelete(USER, 'local:trip:cg-2');

      await expect(loadTripOutbox(USER)).resolves.toEqual([
        { kind: 'update', tripId: 'trip-1', changes: { origin: 'Hotel' } },
        { kind: 'delete', tripId: 'trip-2' },
      ]);
    });

    it('resolves to its real id only after it was sent', async () => {
      await expect(resolveLocalTripId(USER, LOCAL)).resolves.toBeNull();

      await saveResolvedTripId(USER, 'cg-1', 'trip-1');

      await expect(resolveLocalTripId(USER, LOCAL)).resolves.toBe('trip-1');
      await expect(resolveLocalTripId(USER, 'trip-1')).resolves.toBeNull();
    });
  });

  describe('findOfflineTrip', () => {
    it('finds a trip in the queue', async () => {
      await queueTripCreate(USER, 'cg-1', payload, 25);

      await expect(findOfflineTrip(USER, LOCAL)).resolves.toMatchObject({
        id: LOCAL,
        pendingSync: true,
      });
      await expect(
        findOfflineTrip(USER, 'local:trip:gone'),
      ).resolves.toBeNull();
    });

    it('finds a saved trip with its pending edits', async () => {
      await saveTripCache(USER, [cached]);
      await queueTripUpdate(USER, 'trip-1', { origin: 'Hotel' });

      await expect(findOfflineTrip(USER, 'trip-1')).resolves.toMatchObject({
        origin: 'Hotel',
        pendingSync: true,
      });
      await expect(findOfflineTrip(USER, 'trip-9')).resolves.toBeNull();
    });

    it('does not find a trip waiting to be deleted', async () => {
      await saveTripCache(USER, [cached]);
      await queueTripDelete(USER, 'trip-1');

      await expect(findOfflineTrip(USER, 'trip-1')).resolves.toBeNull();
      await expect(loadTripsWithOffline(USER, [cached])).resolves.toEqual([]);
    });
  });
});
