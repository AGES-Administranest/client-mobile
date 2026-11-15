import AsyncStorage from '@react-native-async-storage/async-storage';

import { inventoryStorageKey } from 'features/inventory';

import {
  resetLegacyCleanedForTesting,
  savedProcedureEstimateService,
  SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
  type SavedProcedureEstimate,
} from './savedProcedureEstimateService';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  resetLegacyCleanedForTesting();
});

const userA = 'user-account-123';
const userB = 'user-account-456';

const mockSavedA: SavedProcedureEstimate = {
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

const mockSavedB: SavedProcedureEstimate = {
  hours: '1',
  minutes: '0',
  client: null,
  supplies: [],
  estimate: null,
  savedAt: '2026-11-04T14:00:00.000Z',
};

describe('savedProcedureEstimateService', () => {
  it('saves and loads simulation scoped by user id', async () => {
    await savedProcedureEstimateService.save(userA, mockSavedA);

    const loadedA = await savedProcedureEstimateService.load(userA);
    expect(loadedA).toEqual(mockSavedA);

    const keyA = inventoryStorageKey(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
      userA,
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      keyA,
      JSON.stringify(mockSavedA),
    );
  });

  it('keeps simulations separated so two users do not see each others data', async () => {
    await savedProcedureEstimateService.save(userA, mockSavedA);
    await savedProcedureEstimateService.save(userB, mockSavedB);

    const loadedA = await savedProcedureEstimateService.load(userA);
    const loadedB = await savedProcedureEstimateService.load(userB);

    expect(loadedA).toEqual(mockSavedA);
    expect(loadedB).toEqual(mockSavedB);
    expect(loadedA).not.toEqual(loadedB);
  });

  it('returns null and does not save when userId is missing', async () => {
    await savedProcedureEstimateService.save(null, mockSavedA);
    await savedProcedureEstimateService.save(undefined, mockSavedA);
    await savedProcedureEstimateService.save('', mockSavedA);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    const loadedNull = await savedProcedureEstimateService.load(null);
    const loadedUndefined = await savedProcedureEstimateService.load(undefined);
    const loadedEmpty = await savedProcedureEstimateService.load('');

    expect(loadedNull).toBeNull();
    expect(loadedUndefined).toBeNull();
    expect(loadedEmpty).toBeNull();
  });

  it('removes the legacy un-scoped key on the first read', async () => {
    await AsyncStorage.setItem(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
      JSON.stringify(mockSavedA),
    );

    const loaded = await savedProcedureEstimateService.load(userA);
    expect(loaded).toBeNull();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
    );

    const legacyRaw = await AsyncStorage.getItem(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
    );
    expect(legacyRaw).toBeNull();
  });

  it('returns null when storage contains corrupted JSON', async () => {
    const keyA = inventoryStorageKey(
      SAVED_PROCEDURE_ESTIMATE_STORAGE_KEY,
      userA,
    );
    await AsyncStorage.setItem(keyA, 'invalid-json');

    const loaded = await savedProcedureEstimateService.load(userA);
    expect(loaded).toBeNull();
  });

  it('clears the saved simulation for the specific user', async () => {
    await savedProcedureEstimateService.save(userA, mockSavedA);
    await savedProcedureEstimateService.save(userB, mockSavedB);

    await savedProcedureEstimateService.clear(userA);

    expect(await savedProcedureEstimateService.load(userA)).toBeNull();
    expect(await savedProcedureEstimateService.load(userB)).toEqual(mockSavedB);
  });
});
