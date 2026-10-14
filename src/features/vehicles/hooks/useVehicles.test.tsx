import ReactTestRenderer, { act } from 'react-test-renderer';

import { useVehicles, type UseVehiclesOptions } from './useVehicles';
import type { Vehicle } from '../domain/vehicle.types';
import {
  createVehicle,
  fetchVehicles,
  inactivateVehicle,
  updateVehicle,
} from '../services/vehicleService';

jest.mock('../services/vehicleService', () => ({
  fetchVehicles: jest.fn(),
  createVehicle: jest.fn(),
  updateVehicle: jest.fn(),
  inactivateVehicle: jest.fn(),
}));

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v-1',
    brand: 'Fiat',
    model: 'Strada 2021',
    fuelType: 'FLEX',
    avgConsumptionKmL: '12.5',
    fuelPrice: '5.899',
    costPerKm: '0.4719',
    active: true,
  },
  {
    id: 'v-2',
    brand: 'Honda',
    model: 'CG 160',
    fuelType: 'GASOLINE',
    avgConsumptionKmL: '35.0',
    fuelPrice: '5.899',
    costPerKm: '0.1685',
    active: false,
  },
];

function renderVehiclesHook(options: UseVehiclesOptions = {}) {
  const result = {
    current: null as unknown as ReturnType<typeof useVehicles>,
  };

  function TestHarness() {
    result.current = useVehicles(options);
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return result;
}

describe('useVehicles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches vehicles and excludes inactive ones', async () => {
    (fetchVehicles as jest.Mock).mockResolvedValueOnce(MOCK_VEHICLES);

    let hook!: ReturnType<typeof renderVehiclesHook>;
    await act(async () => {
      hook = renderVehiclesHook({ token: 'test-token', autoFetch: true });
    });

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.vehicles).toHaveLength(1);
    expect(hook.current.vehicles[0].id).toBe('v-1');
  });

  it('creates vehicle and adds to top of list', async () => {
    (fetchVehicles as jest.Mock).mockResolvedValueOnce([MOCK_VEHICLES[0]]);

    const newVehicle: Vehicle = {
      id: 'v-3',
      brand: 'Toyota',
      model: 'Corolla',
      fuelType: 'FLEX',
      avgConsumptionKmL: '11.0',
      fuelPrice: '5.899',
      costPerKm: '0.5362',
      active: true,
    };
    (createVehicle as jest.Mock).mockResolvedValueOnce(newVehicle);

    let hook!: ReturnType<typeof renderVehiclesHook>;
    await act(async () => {
      hook = renderVehiclesHook({ token: 'test-token', autoFetch: true });
    });

    await act(async () => {
      await hook.current.createVehicle({
        brand: 'Toyota',
        model: 'Corolla',
        fuelType: 'FLEX',
        avgConsumptionKmL: 11,
        fuelPrice: 5.899,
      });
    });

    expect(hook.current.vehicles).toHaveLength(2);
    expect(hook.current.vehicles[0].id).toBe('v-3');
  });

  it('updates vehicle in the list', async () => {
    (fetchVehicles as jest.Mock).mockResolvedValueOnce([MOCK_VEHICLES[0]]);

    const updatedVehicle: Vehicle = {
      ...MOCK_VEHICLES[0],
      fuelPrice: '6.10',
      costPerKm: '0.4880',
    };
    (updateVehicle as jest.Mock).mockResolvedValueOnce(updatedVehicle);

    let hook!: ReturnType<typeof renderVehiclesHook>;
    await act(async () => {
      hook = renderVehiclesHook({ token: 'test-token', autoFetch: true });
    });

    await act(async () => {
      await hook.current.updateVehicle('v-1', { fuelPrice: 6.1 });
    });

    expect(hook.current.vehicles[0].fuelPrice).toBe('6.10');
  });

  it('inactivates vehicle and removes from list', async () => {
    (fetchVehicles as jest.Mock).mockResolvedValueOnce([MOCK_VEHICLES[0]]);
    (inactivateVehicle as jest.Mock).mockResolvedValueOnce({
      ...MOCK_VEHICLES[0],
      active: false,
    });

    let hook!: ReturnType<typeof renderVehiclesHook>;
    await act(async () => {
      hook = renderVehiclesHook({ token: 'test-token', autoFetch: true });
    });

    expect(hook.current.vehicles).toHaveLength(1);

    await act(async () => {
      await hook.current.inactivateVehicle('v-1');
    });

    expect(hook.current.vehicles).toHaveLength(0);
  });

  it('handles fetch error gracefully without crashing', async () => {
    const error = new Error('Network error');
    (fetchVehicles as jest.Mock).mockRejectedValueOnce(error);

    let hook!: ReturnType<typeof renderVehiclesHook>;
    await act(async () => {
      hook = renderVehiclesHook({ token: 'test-token', autoFetch: true });
    });

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.error).toBe(error);
    expect(hook.current.vehicles).toEqual([]);
  });
});
