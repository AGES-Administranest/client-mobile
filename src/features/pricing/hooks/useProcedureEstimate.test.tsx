import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ApiError } from 'shared/services/apiClient';

import { useProcedureEstimate } from './useProcedureEstimate';
import type { ProcedureEstimateResponse } from '../domain/pricing.types';
import { pricingService } from '../services/pricingService';
import {
  resetLegacyCleanedForTesting,
  savedProcedureEstimateService,
} from '../services/savedProcedureEstimateService';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'test-token' },
    account: { id: 'test-user' },
  }),
}));

jest.mock('../services/pricingService', () => {
  const actual = jest.requireActual('../services/pricingService');
  return {
    ...actual,
    pricingService: {
      getHourlyRate: jest.fn(),
      estimateProcedure: jest.fn(),
    },
  };
});

const mockEstimateResponse: ProcedureEstimateResponse = {
  minimumPrice: '131.47',
  breakEvenPrice: '126.28',
  hoursCost: '57.12',
  tripCost: '49.35',
  suppliesCost: '25.00',
  hourlyRateUsed: '38.08',
  minimumHourlyRateUsed: '34.62',
  tripEstimateAvailable: true,
  tripEstimateDays: 2,
  suppliesWithoutCost: [],
  durationMinutes: 90,
  month: 11,
  year: 2026,
};

let current: ReturnType<typeof useProcedureEstimate>;

function Probe({ debounceMs = 50 }: { debounceMs?: number }) {
  current = useProcedureEstimate(debounceMs);
  return null;
}

describe('useProcedureEstimate', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    resetLegacyCleanedForTesting();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in idle status and makes no API call when no simulation is saved and duration is empty', async () => {
    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(current.status).toBe('idle');
    expect(pricingService.estimateProcedure).not.toHaveBeenCalled();
  });

  it('restores saved simulation on mount, displays result without editing, and calls estimateProcedure once', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await savedProcedureEstimateService.save('test-user', {
      hours: '1',
      minutes: '30',
      client: { id: 'client-1', name: 'Clínica Veterinária' },
      supplies: [
        {
          itemId: 'item-1',
          name: 'Seringa',
          unit: 'un',
          quantity: 2,
          unitCost: 15,
        },
      ],
      estimate: null,
      savedAt: '2026-11-09T10:00:00.000Z',
    });

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    expect(current.hours).toBe('1');
    expect(current.minutes).toBe('30');
    expect(current.selectedClient?.name).toBe('Clínica Veterinária');
    expect(current.selectedSupplies).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(pricingService.estimateProcedure).toHaveBeenCalledTimes(1);
    expect(pricingService.estimateProcedure).toHaveBeenCalledWith(
      'test-token',
      {
        durationMinutes: 90,
        clientId: 'client-1',
        supplies: [{ itemId: 'item-1', quantity: 2 }],
      },
    );

    expect(current.status).toBe('success');
    expect(current.estimate?.minimumPrice).toBe(131.47);
  });

  it('calculates estimate when duration is set and debounces', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    expect(current.status).toBe('idle');

    act(() => {
      current.setHours('1');
      current.setMinutes('30');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(pricingService.estimateProcedure).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        durationMinutes: 90,
      }),
    );

    expect(current.status).toBe('success');
    expect(current.estimate?.minimumPrice).toBe(131.47);
  });

  it('transitions to needsPricingSetup if estimateProcedure rejects with 404 PRICING_SETTINGS_NOT_FOUND', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockRejectedValue(
      new ApiError('Not found', 'PRICING_SETTINGS_NOT_FOUND', 404),
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.setHours('1');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('needsPricingSetup');
  });

  it('transitions to needsPricingSetup if estimateProcedure rejects with 409', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockRejectedValue(
      new ApiError('Conflict', 'PRICING_SETTINGS_NOT_FOUND', 409),
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.setHours('1');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('needsPricingSetup');
  });

  it('recalculates on reload after pricing setup is completed', async () => {
    (pricingService.estimateProcedure as jest.Mock)
      .mockRejectedValueOnce(
        new ApiError('Not found', 'PRICING_SETTINGS_NOT_FOUND', 404),
      )
      .mockResolvedValueOnce(mockEstimateResponse);

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.setHours('1');
      current.setMinutes('30');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('needsPricingSetup');

    act(() => {
      current.reload();
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('success');
    expect(current.estimate?.minimumPrice).toBe(131.47);
  });

  it('transitions to error if estimateProcedure rejects with 400 validation error', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockRejectedValueOnce(
      new ApiError('Bad request', 'VALIDATION_ERROR', 400),
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.setHours('1');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('error');
  });

  it('transitions to error if estimateProcedure rejects with generic error and allows retry', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockRejectedValueOnce(
      new Error('Network failure'),
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.setHours('1');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('error');

    (pricingService.estimateProcedure as jest.Mock).mockResolvedValueOnce(
      mockEstimateResponse,
    );

    act(() => {
      current.retry();
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('success');
  });

  it('adds and removes supplies properly', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.addSupply({
        itemId: 'syringe-1',
        name: 'Seringa 20ml',
        unit: 'un',
        quantity: 2,
        unitCost: 15.0,
      });
    });

    expect(current.selectedSupplies).toHaveLength(1);
    expect(current.selectedSupplies[0].name).toBe('Seringa 20ml');

    act(() => {
      current.removeSupply('syringe-1');
    });

    expect(current.selectedSupplies).toHaveLength(0);
  });

  it('sums quantity when adding a supply that already exists in the list', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.addSupply({
        itemId: 'syringe-1',
        name: 'Seringa 20ml',
        unit: 'un',
        quantity: 2,
        unitCost: 15.0,
      });
    });

    expect(current.selectedSupplies[0].quantity).toBe(2);

    act(() => {
      current.addSupply({
        itemId: 'syringe-1',
        name: 'Seringa 20ml',
        unit: 'un',
        quantity: 3,
        unitCost: 15.0,
      });
    });

    expect(current.selectedSupplies).toHaveLength(1);
    expect(current.selectedSupplies[0].quantity).toBe(5);
  });

  it('updates quantity of an existing supply', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.addSupply({
        itemId: 'syringe-1',
        name: 'Seringa 20ml',
        unit: 'un',
        quantity: 2,
        unitCost: 15.0,
      });
    });

    act(() => {
      current.updateSupplyQuantity('syringe-1', 4);
    });

    expect(current.selectedSupplies[0].quantity).toBe(4);
  });

  it('clears all fields when clearForm is called', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    act(() => {
      current.setHours('2');
      current.setMinutes('30');
      current.selectClient({ id: 'c1', name: 'Clínica' });
      current.addSupply({
        itemId: 's1',
        name: 'Insumo',
        unit: 'un',
        quantity: 1,
        unitCost: 10,
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('success');

    act(() => {
      current.clearForm();
    });

    expect(current.hours).toBe('');
    expect(current.minutes).toBe('');
    expect(current.selectedClient).toBeNull();
    expect(current.selectedSupplies).toEqual([]);
    expect(current.estimate).toBeNull();
    expect(current.status).toBe('idle');
  });

  it('saves simulation locally when saveSimulation is called and sets canSave', async () => {
    (pricingService.estimateProcedure as jest.Mock).mockResolvedValue(
      mockEstimateResponse,
    );

    await act(async () => {
      ReactTestRenderer.create(<Probe debounceMs={50} />);
      await Promise.resolve();
    });

    expect(current.canSave).toBe(false);

    act(() => {
      current.setHours('1');
      current.setMinutes('30');
    });

    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    expect(current.status).toBe('success');
    expect(current.canSave).toBe(true);

    let saveResult = false;
    await act(async () => {
      saveResult = await current.saveSimulation();
    });

    expect(saveResult).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
