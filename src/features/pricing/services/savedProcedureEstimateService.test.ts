import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  savedProcedureEstimateService,
  SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
  type SavedProcedureEstimate,
} from './savedProcedureEstimateService';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

const mockSaved: SavedProcedureEstimate = {
  hours: '2',
  minutes: '30',
  client: { id: 'client-1', name: 'Clínica Veterinária Boa Vida' },
  supplies: [
    {
      itemId: 'item-1',
      name: 'Anestésico',
      unit: 'unidades',
      quantity: 2,
      unitCost: 15,
    },
  ],
  estimate: {
    minimumPrice: 221,
    breakEvenPrice: 210,
    hoursCost: 150,
    tripCost: 35,
    suppliesCost: 36,
    hourlyRateUsed: 60,
    minimumHourlyRateUsed: 55,
    tripEstimateAvailable: true,
    tripEstimateDays: 2,
    suppliesWithoutCost: [],
    durationMinutes: 150,
    month: 11,
    year: 2026,
  },
  savedAt: '2026-11-04T12:00:00.000Z',
};

describe('savedProcedureEstimateService', () => {
  it('saves and loads the procedure simulation properly', async () => {
    await savedProcedureEstimateService.save(mockSaved);

    const loaded = await savedProcedureEstimateService.load();
    expect(loaded).toEqual(mockSaved);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
      JSON.stringify(mockSaved),
    );
  });

  it('returns null when storage is empty', async () => {
    const loaded = await savedProcedureEstimateService.load();
    expect(loaded).toBeNull();
  });

  it('returns null when storage contains corrupted JSON', async () => {
    await AsyncStorage.setItem(SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY, 'invalid-json');

    const loaded = await savedProcedureEstimateService.load();
    expect(loaded).toBeNull();
  });

  it('clears the saved simulation', async () => {
    await savedProcedureEstimateService.save(mockSaved);
    await savedProcedureEstimateService.clear();

    const loaded = await savedProcedureEstimateService.load();
    expect(loaded).toBeNull();
  });
});

