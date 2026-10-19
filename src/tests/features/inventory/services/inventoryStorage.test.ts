import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadAlertTimestamps,
  saveAlertTimestamps,
} from 'features/inventory/services/alertTimestampsRepository';
import {
  loadDismissedAlerts,
  saveDismissedAlerts,
} from 'features/inventory/services/dismissedAlertsRepository';
import {
  loadExpirySchedule,
  saveExpirySchedule,
} from 'features/inventory/services/expiryScheduleRepository';
import {
  loadNotifiedIds,
  saveNotifiedIds,
} from 'features/inventory/services/lowStockAlertRepository';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const storage = new Map<string, string>();
const mockedStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  storage.clear();
  mockedStorage.getItem.mockImplementation(
    async key => storage.get(key) ?? null,
  );
  mockedStorage.setItem.mockImplementation(async (key, value) => {
    storage.set(key, value);
  });
});

it('isola toda a memória de alertas por usuário', async () => {
  await saveAlertTimestamps('ana', { 'lowStock:a': 1 });
  await saveDismissedAlerts('ana', ['lowStock:a']);
  await saveExpirySchedule('ana', { lote: 'notification-1' });
  await saveNotifiedIds('ana', ['a']);

  expect(await loadAlertTimestamps('bia')).toEqual({});
  expect(await loadDismissedAlerts('bia')).toEqual([]);
  expect(await loadExpirySchedule('bia')).toEqual({});
  expect(await loadNotifiedIds('bia')).toEqual([]);

  expect(await loadAlertTimestamps('ana')).toEqual({ 'lowStock:a': 1 });
  expect(await loadDismissedAlerts('ana')).toEqual(['lowStock:a']);
  expect(await loadExpirySchedule('ana')).toEqual({ lote: 'notification-1' });
  expect(await loadNotifiedIds('ana')).toEqual(['a']);
});

it('codifica identificadores para não criar chaves ambíguas', async () => {
  await saveNotifiedIds('conta:principal/1', ['a']);

  expect([...storage.keys()][0]).toContain('conta%3Aprincipal%2F1');
});
