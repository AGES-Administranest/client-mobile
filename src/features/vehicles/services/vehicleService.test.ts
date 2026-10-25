import { apiClient } from 'shared/services/apiClient';

import {
  createVehicle,
  fetchVehicles,
  inactivateVehicle,
  updateVehicle,
  vehicleService,
} from './vehicleService';
import type { Vehicle } from '../domain/vehicle.types';

jest.mock('shared/services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const MOCK_VEHICLE: Vehicle = {
  id: 'v-1',
  brand: 'Fiat',
  model: 'Strada',
  fuelType: 'FLEX',
  avgConsumptionKmL: '12.5',
  fuelPrice: '5.89',
  costPerKm: '0.4719',
  active: true,
};

describe('vehicleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchVehicles calls GET /vehicles', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([MOCK_VEHICLE]);
    const res = await fetchVehicles('test-token');
    expect(apiClient.get).toHaveBeenCalledWith('/vehicles', {
      token: 'test-token',
    });
    expect(res).toEqual([MOCK_VEHICLE]);
  });

  it('createVehicle calls POST /vehicles with dto', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue(MOCK_VEHICLE);
    const dto = {
      brand: 'Fiat',
      model: 'Strada',
      fuelType: 'FLEX' as const,
      avgConsumptionKmL: 12.5,
      fuelPrice: 5.89,
    };
    const res = await createVehicle('test-token', dto);
    expect(apiClient.post).toHaveBeenCalledWith('/vehicles', dto, {
      token: 'test-token',
    });
    expect(res).toEqual(MOCK_VEHICLE);
  });

  it('updateVehicle calls PATCH /vehicles/:id with dto', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue(MOCK_VEHICLE);
    const dto = { model: 'Strada 2022' };
    const res = await updateVehicle('test-token', 'v-1', dto);
    expect(apiClient.patch).toHaveBeenCalledWith('/vehicles/v-1', dto, {
      token: 'test-token',
    });
    expect(res).toEqual(MOCK_VEHICLE);
  });

  it('inactivateVehicle calls DELETE /vehicles/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({
      ...MOCK_VEHICLE,
      active: false,
    });
    const res = await inactivateVehicle('test-token', 'v-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/vehicles/v-1', {
      token: 'test-token',
    });
    expect(res.active).toBe(false);
  });

  it('vehicleService object delegates to the functions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await vehicleService.fetchAll('tok');
    expect(apiClient.get).toHaveBeenCalledWith('/vehicles', { token: 'tok' });
  });
});
