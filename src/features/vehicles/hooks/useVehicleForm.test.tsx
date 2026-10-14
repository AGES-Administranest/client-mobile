import ReactTestRenderer, { act } from 'react-test-renderer';

import { useVehicleForm, type UseVehicleFormOptions } from './useVehicleForm';
import type { Vehicle } from '../domain/vehicle.types';
import { vehicleService } from '../services/vehicleService';

jest.mock('../services/vehicleService', () => ({
  vehicleService: {
    create: jest.fn(),
    update: jest.fn(),
    inactivate: jest.fn(),
  },
}));

const MOCK_VEHICLE: Vehicle = {
  id: 'v-1',
  brand: 'Fiat',
  model: 'Strada 2021',
  fuelType: 'FLEX',
  avgConsumptionKmL: '12.5',
  fuelPrice: '5.89',
  costPerKm: '0.4712',
  active: true,
};

function renderVehicleFormHook(options: UseVehicleFormOptions = {}) {
  const result = {
    current: null as unknown as ReturnType<typeof useVehicleForm>,
  };

  function TestHarness() {
    result.current = useVehicleForm(options);
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return result;
}

describe('useVehicleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes in create mode by default when no vehicle is provided', () => {
    const hook = renderVehicleFormHook();
    expect(hook.current.mode).toBe('create');
    expect(hook.current.values.brand).toBe('');
    expect(hook.current.values.model).toBe('');
    expect(hook.current.values.fuelType).toBe('FLEX');
  });

  it('initializes in view mode when a vehicle is provided', () => {
    const hook = renderVehicleFormHook({ vehicle: MOCK_VEHICLE });
    expect(hook.current.mode).toBe('view');
    expect(hook.current.values.brand).toBe('Fiat');
    expect(hook.current.values.model).toBe('Strada 2021');
    expect(hook.current.values.avgConsumptionKmL).toBe('12.5');
    expect(hook.current.values.fuelPrice).toBe('5.89');
    expect(hook.current.costPerKmEstimate).toBeCloseTo(0.4712, 3);
  });

  it('updates field value and computes cost estimate', () => {
    const hook = renderVehicleFormHook();
    act(() => {
      hook.current.setFieldValue('avgConsumptionKmL', '10');
      hook.current.setFieldValue('fuelPrice', '5');
    });

    expect(hook.current.values.avgConsumptionKmL).toBe('10');
    expect(hook.current.values.fuelPrice).toBe('5');
    expect(hook.current.costPerKmEstimate).toBe(0.5);
  });

  it('does not submit when validation fails', async () => {
    const onSuccess = jest.fn();
    const hook = renderVehicleFormHook({ onSuccess });

    let success = true;
    await act(async () => {
      success = await hook.current.submit();
    });

    expect(success).toBe(false);
    expect(hook.current.errors.brand).toBe('brandRequired');
    expect(hook.current.errors.model).toBe('modelRequired');
    expect(vehicleService.create).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('creates vehicle successfully', async () => {
    (vehicleService.create as jest.Mock).mockResolvedValue(MOCK_VEHICLE);
    const onSuccess = jest.fn();
    const hook = renderVehicleFormHook({ token: 'tok', onSuccess });

    act(() => {
      hook.current.setFieldValue('brand', 'Fiat');
      hook.current.setFieldValue('model', 'Strada 2021');
      hook.current.setFieldValue('fuelType', 'FLEX');
      hook.current.setFieldValue('avgConsumptionKmL', '12.5');
      hook.current.setFieldValue('fuelPrice', '5.89');
    });

    let success = false;
    await act(async () => {
      success = await hook.current.submit();
    });

    expect(success).toBe(true);
    expect(vehicleService.create).toHaveBeenCalledWith('tok', {
      brand: 'Fiat',
      model: 'Strada 2021',
      fuelType: 'FLEX',
      avgConsumptionKmL: 12.5,
      fuelPrice: 5.89,
    });
    expect(onSuccess).toHaveBeenCalledWith(MOCK_VEHICLE);
  });

  it('updates vehicle in edit mode', async () => {
    (vehicleService.update as jest.Mock).mockResolvedValue(MOCK_VEHICLE);
    const onSuccess = jest.fn();
    const hook = renderVehicleFormHook({
      vehicle: MOCK_VEHICLE,
      mode: 'edit',
      token: 'tok',
      onSuccess,
    });

    act(() => {
      hook.current.setFieldValue('model', 'Strada 2022');
    });

    let success = false;
    await act(async () => {
      success = await hook.current.submit();
    });

    expect(success).toBe(true);
    expect(vehicleService.update).toHaveBeenCalledWith('tok', 'v-1', {
      brand: 'Fiat',
      model: 'Strada 2022',
      fuelType: 'FLEX',
      avgConsumptionKmL: 12.5,
      fuelPrice: 5.89,
    });
    expect(onSuccess).toHaveBeenCalledWith(MOCK_VEHICLE);
  });

  it('inactivates vehicle successfully', async () => {
    (vehicleService.inactivate as jest.Mock).mockResolvedValue({
      ...MOCK_VEHICLE,
      active: false,
    });
    const onInactivateSuccess = jest.fn();
    const hook = renderVehicleFormHook({
      vehicle: MOCK_VEHICLE,
      token: 'tok',
      onInactivateSuccess,
    });

    let success = false;
    await act(async () => {
      success = await hook.current.inactivate();
    });

    expect(success).toBe(true);
    expect(vehicleService.inactivate).toHaveBeenCalledWith('tok', 'v-1');
    expect(onInactivateSuccess).toHaveBeenCalledWith('v-1');
  });

  it('reactivates vehicle successfully', async () => {
    (vehicleService.update as jest.Mock).mockResolvedValue({
      ...MOCK_VEHICLE,
      active: true,
    });
    const onSuccess = jest.fn();
    const hook = renderVehicleFormHook({
      vehicle: { ...MOCK_VEHICLE, active: false },
      token: 'tok',
      onSuccess,
    });

    let success = false;
    await act(async () => {
      success = await hook.current.reactivate();
    });

    expect(success).toBe(true);
    expect(vehicleService.update).toHaveBeenCalledWith('tok', 'v-1', {
      active: true,
    });
    expect(onSuccess).toHaveBeenCalledWith({
      ...MOCK_VEHICLE,
      active: true,
    });
  });
});
