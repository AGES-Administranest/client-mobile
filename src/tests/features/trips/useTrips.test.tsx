import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from 'react-test-renderer';

import type { Trip } from 'features/trips/domain/trip.types';
import { useTrips, type UseTripsOptions } from 'features/trips/hooks/useTrips';
import {
  loadTripCache,
  loadTripsWithOffline,
  notifyOfflineTripsChanged,
  queueTripCreate,
  saveTripCache,
} from 'features/trips/services/offlineTripStore';
import { tripService } from 'features/trips/services/tripService';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' },
};

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/trips/services/tripService', () => ({
  tripService: { list: jest.fn() },
}));
jest.mock('features/trips/services/offlineTripStore', () => {
  const actual = jest.requireActual('features/trips/services/offlineTripStore');
  return {
    ...actual,
    loadTripsWithOffline: jest.fn(actual.loadTripsWithOffline),
  };
});

const list = jest.mocked(tripService.list);

const trip = (id: string, overrides: Partial<Trip> = {}): Trip => ({
  id,
  mode: 'RIDE',
  vehicleId: null,
  appointmentId: null,
  clientId: null,
  occurredOn: '2026-10-10',
  origin: 'Casa',
  destination: 'Clínica',
  distanceKm: null,
  cost: '10',
  ...overrides,
});

const page = (items: Trip[], overrides = {}) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  totalKm: '12.50',
  totalCost: '30.00',
  ...overrides,
});

const mount = (options: UseTripsOptions = {}) =>
  renderHook(() => useTrips(options));

const idsOf = (trips: Trip[]) => trips.map(item => item.id);

beforeEach(async () => {
  list.mockReset();
  mockAuth.session = { idToken: 'token' };
  await AsyncStorage.clear();
});

describe('useTrips', () => {
  it('lists the trips of the server, newest first, with its totals', async () => {
    list.mockResolvedValue(
      page([
        trip('old', { occurredOn: '2026-10-01' }),
        trip('new', { occurredOn: '2026-10-20' }),
      ]),
    );

    const hook = await mount({ from: '2026-10-01', to: '2026-10-31' });

    expect(list).toHaveBeenCalledWith('token', {
      from: '2026-10-01',
      to: '2026-10-31',
      page: 1,
      pageSize: 20,
    });
    expect(idsOf(hook.current.trips)).toEqual(['new', 'old']);
    expect(hook.current).toMatchObject({
      totalKm: '12.50',
      totalCost: '30.00',
      total: 2,
      isLoading: false,
      hasMore: false,
      error: null,
    });
  });

  it('groups the trips by day with a readable label', async () => {
    list.mockResolvedValue(
      page([
        trip('a', { occurredOn: '2026-10-20' }),
        trip('b', { occurredOn: '2026-10-20' }),
        trip('c', { occurredOn: '2026-10-01' }),
      ]),
    );

    const { groupedTrips } = (await mount()).current;

    expect(groupedTrips.map(group => idsOf(group.trips))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
    expect(groupedTrips[0].formattedDate).toBe('TER, 20 OUT');
  });

  it('keeps the raw date when it cannot be formatted', async () => {
    list.mockResolvedValue(page([trip('a')]));

    const hook = await mount({ locale: 'not a locale' });

    expect(hook.current.groupedTrips[0].formattedDate).toBe('2026-10-10');
  });

  it.each([
    ['the server does not answer', () => list.mockRejectedValue(new Error())],
    ['there is no session', () => (mockAuth.session = null)],
  ])('shows the trips saved earlier when %s', async (_case, arrange) => {
    await saveTripCache('user-1', [
      trip('a', { cost: '10.50', distanceKm: '5' }),
      trip('b', { cost: 'x', distanceKm: 'x' }),
      trip('c', { cost: 2, distanceKm: 1.25 }),
    ]);
    arrange();

    const hook = await mount();

    expect(idsOf(hook.current.trips)).toEqual(['a', 'b', 'c']);
    // Nothing came from the server, so the totals are worked out here.
    expect(hook.current.totalKm).toBe('6.25');
    expect(hook.current.totalCost).toBe('12.50');
  });

  it('saves the first page, but not a list of one client or appointment', async () => {
    list.mockResolvedValue(page([trip('a')]));

    await mount({ clientId: 'client-1' });
    await mount({ appointmentId: 'appointment-1' });
    await expect(loadTripCache('user-1')).resolves.toEqual([]);

    await mount();
    await expect(loadTripCache('user-1')).resolves.toHaveLength(1);
  });

  it('keeps to the period, the client and the appointment asked for', async () => {
    list.mockResolvedValue(
      page([
        trip('match', { clientId: 'c', appointmentId: 'a' }),
        trip('other client', { clientId: 'x', appointmentId: 'a' }),
        trip('other appointment', { clientId: 'c', appointmentId: 'x' }),
        trip('early', {
          clientId: 'c',
          appointmentId: 'a',
          occurredOn: '2026-09-30',
        }),
        trip('late', {
          clientId: 'c',
          appointmentId: 'a',
          occurredOn: '2026-11-01',
        }),
      ]),
    );

    const hook = await mount({
      from: '2026-10-01',
      to: '2026-10-31',
      clientId: 'c',
      appointmentId: 'a',
    });

    expect(idsOf(hook.current.trips)).toEqual(['match']);
  });

  it('adds the pages without repeating a trip', async () => {
    list
      .mockResolvedValueOnce(page([trip('a'), trip('b')], { total: 3 }))
      .mockResolvedValueOnce(page([trip('b'), trip('c')], { total: 3 }));
    const hook = await mount({ pageSize: 2 });
    expect(hook.current.hasMore).toBe(true);

    await act(async () => hook.current.loadMore());

    expect(list).toHaveBeenLastCalledWith(
      'token',
      expect.objectContaining({ page: 2 }),
    );
    expect(idsOf(hook.current.trips)).toEqual(['a', 'b', 'c']);
  });

  it('does not ask for a page that is not there', async () => {
    list.mockResolvedValue(page([trip('a')]));
    const hook = await mount();

    await act(async () => hook.current.loadMore());

    expect(list).toHaveBeenCalledTimes(1);
  });

  it('waits to be asked when it does not fetch by itself', async () => {
    list.mockResolvedValue(page([trip('a')]));
    const hook = await mount({ autoFetch: false });
    expect(list).not.toHaveBeenCalled();

    await act(async () => {
      await hook.current.refetch();
    });

    expect(idsOf(hook.current.trips)).toEqual(['a']);
  });

  it('shows a trip queued offline as soon as it is queued', async () => {
    list.mockResolvedValue(page([trip('a')]));
    const hook = await mount();

    await act(async () => {
      await queueTripCreate(
        'user-1',
        'cg-1',
        {
          mode: 'RIDE',
          occurredOn: '2026-10-21',
          origin: 'Casa',
          destination: 'HospVet',
          cost: 20,
        },
        20,
      );
    });

    expect(idsOf(hook.current.trips)).toEqual(['local:trip:cg-1', 'a']);
  });

  it('stops listening to the queue once it is gone', async () => {
    list.mockResolvedValue(page([]));
    const hook = await mount();
    hook.unmount();

    notifyOfflineTripsChanged();

    expect(list).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new Error('storage broke'), 'storage broke'],
    ['storage broke', 'storage broke'],
  ])('reports what it could not read (%p)', async (failure, message) => {
    list.mockResolvedValue(page([]));
    jest.mocked(loadTripsWithOffline).mockRejectedValueOnce(failure);

    const hook = await mount();

    expect(hook.current.error?.message).toBe(message);
    expect(hook.current.isLoading).toBe(false);
  });
});
