import { act } from 'react-test-renderer';

import type { Trip } from 'features/trips/domain/trip.types';
import {
  useTripForm,
  type UseTripFormOptions,
} from 'features/trips/hooks/useTripForm';
import {
  queueTripCreate,
  queueTripDelete,
  queueTripUpdate,
} from 'features/trips/services/offlineTripStore';
import { tripService } from 'features/trips/services/tripService';
import { ApiError } from 'shared/services/apiClient';

import { renderHook } from '../../support/renderHook';

const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1' } as { id: string } | null,
};
const mockOnTermChange = jest.fn();

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/vehicles', () => ({
  useVehicles: () => ({
    vehicles: [{ id: 'veh-1', costPerKm: '1.50' }],
    isLoading: false,
  }),
}));
jest.mock('features/clients', () => ({
  useClientSearch: () => ({
    term: '',
    status: 'idle',
    options: [],
    onTermChange: mockOnTermChange,
  }),
}));
jest.mock('features/trips/services/tripService', () => ({
  tripService: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));
jest.mock('features/trips/services/offlineTripStore', () => ({
  ...jest.requireActual('features/trips/domain/offlineTrips'),
  newTripClientGeneratedId: () => 'cg-1',
  queueTripCreate: jest.fn(),
  queueTripUpdate: jest.fn(),
  queueTripDelete: jest.fn(),
}));

const service = jest.mocked(tripService);
const NETWORK_DOWN = new TypeError('Network request failed');
const REFUSED = new ApiError('refused', 'VALIDATION_ERROR', 400);

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  mode: 'RIDE',
  vehicleId: null,
  appointmentId: null,
  clientId: null,
  occurredOn: '2026-10-10',
  origin: 'Casa',
  destination: 'Clínica',
  distanceKm: null,
  cost: '25.5',
  ...overrides,
});

const onSuccess = jest.fn();
const onDeleted = jest.fn();

const mount = (options: UseTripFormOptions = {}) => {
  const props = { onSuccess, onDeleted, ...options };
  return renderHook(() => useTripForm(props));
};

type Form = Awaited<ReturnType<typeof mount>>;

async function fillRoute(form: Form) {
  await act(async () => {
    form.current.setFieldValue('origin', ' Casa ');
    form.current.setFieldValue('destination', ' Clínica ');
  });
}

async function fillOwnVehicle(form: Form) {
  await fillRoute(form);
  await act(async () => {
    form.current.setFieldValue('vehicleId', 'veh-1');
    form.current.setFieldValue('distanceKm', '10,5');
  });
}

async function submit(form: Form) {
  let saved: Trip | null = null;
  await act(async () => {
    saved = await form.current.submit();
  });
  return saved as Trip | null;
}

async function remove(form: Form) {
  let removed = false;
  await act(async () => {
    removed = await form.current.remove();
  });
  return removed;
}

beforeEach(() => {
  jest.resetAllMocks();
  mockAuth.session = { idToken: 'token' };
  mockAuth.account = { id: 'user-1' };
});

describe('useTripForm steps', () => {
  it('only leaves the route step when the route is filled', async () => {
    const form = await mount();

    await act(async () => form.current.nextStep());
    expect(form.current.step).toBe(0);
    expect(form.current.errors).toEqual({
      origin: 'originRequired',
      destination: 'destinationRequired',
    });

    await fillRoute(form);
    expect(form.current.errors).toEqual({});

    await act(async () => form.current.nextStep());
    expect(form.current.step).toBe(1);

    await act(async () => form.current.previousStep());
    expect(form.current.step).toBe(0);
  });

  it('goes back to the route when saving finds an error in it', async () => {
    const form = await mount();
    await fillOwnVehicle(form);
    await act(async () => form.current.nextStep());
    await act(async () => form.current.setFieldValue('origin', ''));

    expect(await submit(form)).toBeNull();

    expect(form.current.step).toBe(0);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('stays on the cost step when the error is there', async () => {
    const form = await mount();
    await fillRoute(form);
    await act(async () => form.current.nextStep());

    expect(await submit(form)).toBeNull();

    expect(form.current.step).toBe(1);
    expect(form.current.errors.vehicleId).toBe('vehicleRequired');
  });

  it('forgets the cost errors of the mode that was left', async () => {
    const form = await mount();
    await fillRoute(form);
    await submit(form);
    expect(form.current.errors.vehicleId).toBe('vehicleRequired');

    await act(async () => form.current.setMode('RIDE'));

    expect(form.current.mode).toBe('RIDE');
    expect(form.current.errors).toEqual({});
  });

  it('starts over when it is opened again', async () => {
    const form = await renderHook(
      ({ active }: { active: boolean }) => useTripForm({ active }),
      { active: true },
    );
    await act(async () => form.current.setFieldValue('origin', 'Casa'));

    await form.rerender({ active: false });
    expect(form.current.values.origin).toBe('Casa');

    await form.rerender({ active: true });
    expect(form.current.values.origin).toBe('');
  });
});

describe('useTripForm cost preview', () => {
  it('multiplies the distance by the cost per km of the vehicle', async () => {
    const form = await mount();
    await fillOwnVehicle(form);

    expect(form.current.selectedVehicle?.id).toBe('veh-1');
    expect(form.current.previewCost).toBe(15.75);
  });

  it('is the fare of a ride', async () => {
    const form = await mount();
    await act(async () => {
      form.current.setMode('RIDE');
      form.current.setFieldValue('cost', '32,90');
    });

    expect(form.current.previewCost).toBe(32.9);
  });
});

describe('useTripForm client', () => {
  it('drops the chosen client when the search is cleared', async () => {
    const form = await mount();
    await act(async () =>
      form.current.clientSearch.onSelect({ id: 'client-1', name: 'VetSul' }),
    );
    expect(form.current.values.clientId).toBe('client-1');

    await act(async () => form.current.clientSearch.onChangeText('Vet'));
    expect(form.current.values.clientId).toBe('client-1');

    await act(async () => form.current.clientSearch.onChangeText(' '));
    expect(form.current.values.clientId).toBeNull();
  });

  it('shows the name of the client of the trip being edited', async () => {
    await mount({ trip: trip({ clientId: 'client-1' }), clientName: 'VetSul' });

    expect(mockOnTermChange).toHaveBeenCalledWith('VetSul');
  });
});

describe('useTripForm saving', () => {
  it('creates the trip on the server, trimmed and parsed', async () => {
    service.create.mockResolvedValue(trip());
    const form = await mount();
    await fillOwnVehicle(form);

    expect(await submit(form)).toEqual(trip());

    expect(service.create).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        mode: 'OWN_VEHICLE',
        origin: 'Casa',
        destination: 'Clínica',
        vehicleId: 'veh-1',
        distanceKm: 10.5,
        cost: undefined,
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(trip());
    expect(queueTripCreate).not.toHaveBeenCalled();
    expect(form.current.submitting).toBe(false);
  });

  it('sends a ride without a vehicle', async () => {
    service.update.mockResolvedValue(trip());
    const form = await mount({ trip: trip({ vehicleId: 'veh-1' }) });

    await submit(form);

    expect(form.current.isEditing).toBe(true);
    expect(service.update).toHaveBeenCalledWith(
      'token',
      'trip-1',
      expect.objectContaining({
        mode: 'RIDE',
        vehicleId: null,
        distanceKm: null,
        cost: 25.5,
      }),
    );
  });

  it.each([
    [
      'the network is down',
      () => service.create.mockRejectedValue(NETWORK_DOWN),
    ],
    ['there is no session', () => (mockAuth.session = null)],
  ])('queues the new trip when %s', async (_case, arrange) => {
    arrange();
    const form = await mount();
    await fillOwnVehicle(form);

    const saved = await submit(form);

    expect(queueTripCreate).toHaveBeenCalledWith(
      'user-1',
      'cg-1',
      expect.objectContaining({ distanceKm: 10.5 }),
      15.75,
    );
    expect(saved).toMatchObject({
      id: 'local:trip:cg-1',
      cost: '15.75',
      pendingSync: true,
    });
    expect(onSuccess).toHaveBeenCalledWith(saved);
  });

  it('queues the edit when the network is down', async () => {
    service.update.mockRejectedValue(NETWORK_DOWN);
    const form = await mount({ trip: trip() });

    const saved = await submit(form);

    expect(queueTripUpdate).toHaveBeenCalledWith(
      'user-1',
      'trip-1',
      expect.objectContaining({ cost: 25.5 }),
      25.5,
    );
    expect(saved).toMatchObject({ id: 'trip-1', pendingSync: true });
  });

  it('edits a trip still in the queue there, even when online', async () => {
    const form = await mount({ trip: trip({ id: 'local:trip:cg-9' }) });

    await submit(form);

    expect(service.update).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
    expect(queueTripUpdate).toHaveBeenCalledWith(
      'user-1',
      'local:trip:cg-9',
      expect.anything(),
      25.5,
    );
  });

  it('reports a refusal instead of queueing what would be refused again', async () => {
    service.update.mockRejectedValue(REFUSED);
    const form = await mount({ trip: trip() });

    expect(await submit(form)).toBeNull();

    expect(form.current.errors.general).toBe('saveFailed');
    expect(queueTripUpdate).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(form.current.submitting).toBe(false);
  });
});

describe('useTripForm removing', () => {
  it('has nothing to remove in a new trip', async () => {
    const form = await mount();

    expect(await remove(form)).toBe(false);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('removes the trip on the server', async () => {
    service.remove.mockResolvedValue(trip());
    const form = await mount({ trip: trip() });

    expect(await remove(form)).toBe(true);

    expect(service.remove).toHaveBeenCalledWith('token', 'trip-1');
    expect(onDeleted).toHaveBeenCalledWith('trip-1');
    expect(queueTripDelete).not.toHaveBeenCalled();
  });

  it('queues the removal when the network is down', async () => {
    service.remove.mockRejectedValue(NETWORK_DOWN);
    const form = await mount({ trip: trip() });

    expect(await remove(form)).toBe(true);

    expect(queueTripDelete).toHaveBeenCalledWith('user-1', 'trip-1');
    expect(onDeleted).toHaveBeenCalledWith('trip-1');
  });

  it('discards a trip still in the queue without asking the server', async () => {
    const form = await mount({ trip: trip({ id: 'local:trip:cg-9' }) });

    expect(await remove(form)).toBe(true);

    expect(service.remove).not.toHaveBeenCalled();
    expect(queueTripDelete).toHaveBeenCalledWith('user-1', 'local:trip:cg-9');
  });

  it('reports a refusal', async () => {
    service.remove.mockRejectedValue(REFUSED);
    const form = await mount({ trip: trip() });

    expect(await remove(form)).toBe(false);

    expect(form.current.errors.general).toBe('deleteFailed');
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
