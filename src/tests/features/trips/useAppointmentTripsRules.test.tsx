import { act } from 'react-test-renderer';

import type { Trip } from 'features/trips/domain/trip.types';
import { useAppointmentTrips } from 'features/trips/hooks/useAppointmentTrips';
import {
  queueTripCreate,
  queueTripDelete,
} from 'features/trips/services/offlineTripStore';
import { tripService } from 'features/trips/services/tripService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as object | null,
  account: { id: 'user-1' },
};
const mockRefetch = jest.fn();

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/vehicles', () => ({
  useVehicles: () => ({ vehicles: [], isLoading: false }),
}));
jest.mock('features/trips/hooks/useTrips', () => ({
  useTrips: () => ({ trips: [], refetch: mockRefetch }),
}));
jest.mock('features/trips/services/tripService', () => ({
  tripService: { create: jest.fn(), remove: jest.fn() },
}));
jest.mock('features/trips/services/offlineTripStore', () => ({
  newTripClientGeneratedId: () => 'cg-1',
  queueTripCreate: jest.fn(),
  queueTripDelete: jest.fn(),
}));

const service = jest.mocked(tripService);

const mount = (occurredOn: string | null = '2026-10-16') =>
  renderHook(() =>
    useAppointmentTrips({
      appointmentId: 'apt-1',
      clientId: null,
      occurredOn,
      defaultOrigin: 'Casa',
      defaultDestination: 'VetSul',
    }),
  );
type Hook = Awaited<ReturnType<typeof mount>>;
const confirm = (hook: Hook) =>
  act(async () => {
    await hook.current.confirm();
  });

beforeEach(() => {
  jest.resetAllMocks();
  mockAuth.session = { idToken: 'token' };
});

describe('useAppointmentTrips rules', () => {
  it('needs an origin', async () => {
    const hook = await mount();
    await act(async () => hook.current.setOrigin('  '));

    await confirm(hook);

    expect(hook.current.error).toBe('originRequired');
  });

  it.each(['', '0', '-1', '5000,01', '1,234', 'x'])(
    'refuses the distance "%s" of a vehicle',
    async distance => {
      const hook = await mount();
      await act(async () => {
        hook.current.setSelectedVehicleId('veh-1');
        hook.current.setDistanceKm(distance);
      });

      await confirm(hook);

      expect(hook.current.error).toBe('distanceInvalid');
    },
  );

  it.each(['', '0', '10000,01', 'x'])('refuses the fare "%s"', async fare => {
    const hook = await mount();
    await act(async () => {
      hook.current.setMode('RIDE');
      hook.current.setCost(fare);
    });

    await confirm(hook);

    expect(hook.current.error).toBe('costInvalid');
  });

  it('takes a ride with or without a distance, but not a wrong one', async () => {
    const hook = await mount();
    await act(async () => {
      hook.current.setMode('RIDE');
      hook.current.setCost('10000');
      hook.current.setDistanceKm('0');
    });
    await confirm(hook);
    expect(hook.current.error).toBe('distanceInvalid');
    expect(service.create).not.toHaveBeenCalled();

    await act(async () => hook.current.setDistanceKm('5000'));
    await confirm(hook);

    expect(service.create).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        mode: 'RIDE',
        vehicleId: null,
        distanceKm: 5000,
        cost: 10000,
      }),
    );
    expect(hook.current.mode).toBe('OWN_VEHICLE');
  });

  it('saves nothing while the day of the appointment is unknown', async () => {
    const hook = await mount(null);
    await act(async () => {
      hook.current.setMode('RIDE');
      hook.current.setCost('10');
    });

    await confirm(hook);

    expect(service.create).not.toHaveBeenCalled();
    expect(queueTripCreate).not.toHaveBeenCalled();
  });

  it('knows there is no vehicle', async () => {
    expect((await mount()).current.hasNoVehicles).toBe(true);
  });

  it('forgets what was typed when it is collapsed', async () => {
    const hook = await mount();
    await act(async () => hook.current.toggleExpanded());
    await act(async () => hook.current.setOrigin('Hotel'));
    await act(async () => hook.current.toggleExpanded());

    expect(hook.current.expanded).toBe(false);
    expect(hook.current.origin).toBe('Casa');
  });
});

describe('useAppointmentTrips removing', () => {
  const trip = (id: string) => ({ id } as Trip);
  const drop = async (id: string | null) => {
    const hook = await mount();
    if (id) await act(async () => hook.current.askToDelete(trip(id)));
    await act(async () => {
      await hook.current.confirmDelete();
    });
    return hook;
  };

  it('does nothing until a trip is chosen', async () => {
    await drop(null);

    expect(service.remove).not.toHaveBeenCalled();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it.each([
    ['a trip still in the queue', 'local:trip:cg-1', () => {}],
    [
      'any trip when the network is down',
      'trip-1',
      () => service.remove.mockRejectedValue(new TypeError('down')),
    ],
    ['any trip without a session', 'trip-1', () => (mockAuth.session = null)],
  ])('removes in the queue %s', async (_case, id, arrange) => {
    arrange();

    const hook = await drop(id);

    expect(queueTripDelete).toHaveBeenCalledWith('user-1', id);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(hook.current.tripToDelete).toBeNull();
  });

  it('reports a refusal', async () => {
    service.remove.mockRejectedValue(new ApiError('x', null, 500));

    const hook = await drop('trip-1');

    expect(hook.current.error).toBe('deleteFailed');
    expect(queueTripDelete).not.toHaveBeenCalled();
    expect(hook.current.tripToDelete).toBeNull();
  });
});
