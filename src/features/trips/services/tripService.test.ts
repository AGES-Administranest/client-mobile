import { apiClient } from 'shared/services/apiClient';

import {
  createTrip,
  fetchTripById,
  fetchTrips,
  removeTrip,
  tripService,
  updateTrip,
} from './tripService';
import type {
  CreateTripDto,
  Trip,
  TripListResponse,
  UpdateTripDto,
} from '../domain/trip.types';

jest.mock('shared/services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const MOCK_TRIP: Trip = {
  id: 'trip-1',
  mode: 'OWN_VEHICLE',
  vehicleId: 'veh-1',
  appointmentId: 'app-1',
  clientId: 'client-1',
  occurredOn: '2026-10-18',
  origin: 'Casa',
  destination: 'Clínica',
  distanceKm: '30',
  costPerKm: '0.4719',
  cost: '14.16',
};

const MOCK_LIST_RESPONSE: TripListResponse = {
  items: [MOCK_TRIP],
  total: 1,
  page: 1,
  pageSize: 20,
  totalKm: '30.00',
  totalCost: '14.16',
};

describe('tripService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchTrips calls GET /trips with query parameters', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(MOCK_LIST_RESPONSE);

    const result = await fetchTrips('test-token', {
      from: '2026-10-01',
      to: '2026-10-31',
      page: 1,
      pageSize: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/trips?from=2026-10-01&to=2026-10-31&page=1&pageSize=20',
      { token: 'test-token' },
    );
    expect(result).toEqual(MOCK_LIST_RESPONSE);
  });

  it('fetchTripById calls GET /trips/:id', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(MOCK_TRIP);

    const result = await fetchTripById('test-token', 'trip-1');
    expect(apiClient.get).toHaveBeenCalledWith('/trips/trip-1', {
      token: 'test-token',
    });
    expect(result).toEqual(MOCK_TRIP);
  });

  it('createTrip calls POST /trips', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(MOCK_TRIP);

    const dto: CreateTripDto = {
      mode: 'OWN_VEHICLE',
      vehicleId: 'veh-1',
      occurredOn: '2026-10-18',
      origin: 'Casa',
      destination: 'Clínica',
      distanceKm: 30,
    };

    const result = await createTrip('test-token', dto);
    expect(apiClient.post).toHaveBeenCalledWith('/trips', dto, {
      token: 'test-token',
    });
    expect(result).toEqual(MOCK_TRIP);
  });

  it('updateTrip calls PATCH /trips/:id', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue(MOCK_TRIP);

    const dto: UpdateTripDto = {
      distanceKm: 35,
    };

    const result = await updateTrip('test-token', 'trip-1', dto);
    expect(apiClient.patch).toHaveBeenCalledWith('/trips/trip-1', dto, {
      token: 'test-token',
    });
    expect(result).toEqual(MOCK_TRIP);
  });

  it('removeTrip calls DELETE /trips/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue(MOCK_TRIP);

    const result = await removeTrip('test-token', 'trip-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/trips/trip-1', {
      token: 'test-token',
    });
    expect(result).toEqual(MOCK_TRIP);
  });

  it('never sends appointmentId or clientId, which the API rejects', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(MOCK_LIST_RESPONSE);

    await fetchTrips('test-token', { from: '2026-10-24', to: '2026-10-24' });

    const url = (apiClient.get as jest.Mock).mock.calls[0][0] as string;
    expect(url).toBe('/trips?from=2026-10-24&to=2026-10-24');
  });

  it('exposes tripService object with all methods', () => {
    expect(tripService.list).toBe(fetchTrips);
    expect(tripService.getById).toBe(fetchTripById);
    expect(tripService.create).toBe(createTrip);
    expect(tripService.update).toBe(updateTrip);
    expect(tripService.remove).toBe(removeTrip);
  });
});
