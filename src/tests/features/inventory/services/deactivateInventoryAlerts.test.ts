import AsyncStorage from '@react-native-async-storage/async-storage';

import { deactivateInventoryAlerts } from 'features/inventory/services/deactivateInventoryAlerts';
import {
  loadExpirySchedule,
  saveExpirySchedule,
} from 'features/inventory/services/expiryScheduleRepository';

const mockCancel = jest.fn(async (_id: string) => undefined);
const mockStorage = new Map<string, string>();

jest.mock('shared/services', () => ({
  cancelNotification: (id: string) => mockCancel(id),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));

beforeEach(() => {
  mockStorage.clear();
  mockCancel.mockClear();
  jest.mocked(AsyncStorage.getItem).mockClear();
});

it('cancela somente a agenda da conta que saiu', async () => {
  await saveExpirySchedule('ana', { a: 'notification-a' });
  await saveExpirySchedule('bia', { b: 'notification-b' });

  await deactivateInventoryAlerts('ana');

  expect(mockCancel).toHaveBeenCalledWith('notification-a');
  expect(mockCancel).not.toHaveBeenCalledWith('notification-b');
  expect(await loadExpirySchedule('ana')).toEqual({});
  expect(await loadExpirySchedule('bia')).toEqual({ b: 'notification-b' });
});
