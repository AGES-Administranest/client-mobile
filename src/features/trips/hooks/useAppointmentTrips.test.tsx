import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useAppointmentTrips } from './useAppointmentTrips';
import type { Trip } from '../domain/trip.types';
import { queueTripCreate, queueTripDelete } from '../services/offlineTripStore';
import { tripService } from '../services/tripService';

const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockTrips: Trip[] = [];

jest.mock('./useTrips', () => ({
  useTrips: () => ({ trips: mockTrips, refetch: mockRefetch }),
}));
jest.mock('features/vehicles', () => ({
  useVehicles: () => ({
    vehicles: [{ id: 'veh-1', costPerKm: 1.5 }],
    isLoading: false,
  }),
}));
jest.mock('../services/tripService', () => ({
  tripService: { create: jest.fn(), remove: jest.fn() },
}));
jest.mock('../services/offlineTripStore', () => ({
  newTripClientGeneratedId: () => 'cg-1',
  queueTripCreate: jest.fn().mockResolvedValue(undefined),
  queueTripDelete: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = tripService.create as jest.Mock;
const removeMock = tripService.remove as jest.Mock;

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};
const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof useAppointmentTrips>,
  };

  function Harness() {
    result.current = useAppointmentTrips({
      appointmentId: 'apt-1',
      clientId: 'client-1',
      occurredOn: '2026-10-16',
      defaultOrigin: 'Consultório',
      defaultDestination: 'HospVet Sul',
    });
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });

  return result;
}

async function fillOwnVehicleTrip(result: {
  current: ReturnType<typeof useAppointmentTrips>;
}) {
  await act(async () => result.current.toggleExpanded());
  await act(async () => result.current.setSelectedVehicleId('veh-1'));
  await act(async () => result.current.setDistanceKm('10'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('appointment trips: create', () => {
  it('opens with the appointment clinic as destination', async () => {
    const result = await mountHook();

    await act(async () => result.current.toggleExpanded());

    expect(result.current.destination).toBe('HospVet Sul');
    expect(result.current.origin).toBe('Consultório');
  });

  it('sends the trip tied to the appointment and its clinic, then reloads the list', async () => {
    createMock.mockResolvedValue({});
    const result = await mountHook();
    await fillOwnVehicleTrip(result);

    await act(async () => result.current.confirm());

    expect(createMock).toHaveBeenCalledWith(
      'id-token',
      expect.objectContaining({
        mode: 'OWN_VEHICLE',
        appointmentId: 'apt-1',
        clientId: 'client-1',
        occurredOn: '2026-10-16',
        destination: 'HospVet Sul',
        vehicleId: 'veh-1',
        distanceKm: 10,
      }),
    );
    expect(mockRefetch).toHaveBeenCalled();
    expect(result.current.expanded).toBe(false);
  });

  it('refuses an incomplete trip without calling the API', async () => {
    const result = await mountHook();
    await act(async () => result.current.toggleExpanded());

    await act(async () => result.current.confirm());

    expect(result.current.error).toBe('vehicleRequired');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('queues the trip when there is no connection', async () => {
    createMock.mockRejectedValue(new TypeError('Network request failed'));
    const result = await mountHook();
    await fillOwnVehicleTrip(result);

    await act(async () => result.current.confirm());

    expect(queueTripCreate).toHaveBeenCalledWith(
      'user-1',
      'cg-1',
      expect.objectContaining({ appointmentId: 'apt-1' }),
      15,
    );
    expect(result.current.error).toBeNull();
  });

  it('shows a save error when the API refuses the trip', async () => {
    createMock.mockRejectedValue(new ApiError('bad', 'VALIDATION', 400));
    const result = await mountHook();
    await fillOwnVehicleTrip(result);

    await act(async () => result.current.confirm());

    expect(result.current.error).toBe('saveFailed');
    expect(queueTripCreate).not.toHaveBeenCalled();
  });
});

describe('appointment trips: delete', () => {
  const TRIP = { id: 'trip-1' } as Trip;

  it('removes the trip on the API and reloads', async () => {
    removeMock.mockResolvedValue({});
    const result = await mountHook();

    await act(async () => result.current.askToDelete(TRIP));
    await act(async () => result.current.confirmDelete());

    expect(removeMock).toHaveBeenCalledWith('id-token', 'trip-1');
    expect(mockRefetch).toHaveBeenCalled();
    expect(result.current.tripToDelete).toBeNull();
  });

  it('queues the removal of a trip that is not on the server yet', async () => {
    const result = await mountHook();

    await act(async () =>
      result.current.askToDelete({ id: 'local:abc' } as Trip),
    );
    await act(async () => result.current.confirmDelete());

    expect(removeMock).not.toHaveBeenCalled();
    expect(queueTripDelete).toHaveBeenCalledWith('user-1', 'local:abc');
  });
});
