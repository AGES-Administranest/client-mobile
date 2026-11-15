import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearLocalUserData, registerLocalDataCleaner } from './localData';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

const storage = jest.mocked(AsyncStorage);

beforeEach(() => {
  jest.clearAllMocks();
  storage.multiRemove.mockResolvedValue();
});

it('removes every key of the app and leaves the ones of other libraries', async () => {
  storage.getAllKeys.mockResolvedValue([
    '@administranest:clients:user-1',
    '@administranest:stock:pending-movements:user-1',
    '@administranest:auth:session',
    'expo-notifications:token',
  ]);

  await clearLocalUserData();

  expect(storage.multiRemove).toHaveBeenCalledWith([
    '@administranest:clients:user-1',
    '@administranest:stock:pending-movements:user-1',
    '@administranest:auth:session',
  ]);
});

it('skips the removal when there is nothing of the app to remove', async () => {
  storage.getAllKeys.mockResolvedValue(['expo-notifications:token']);

  await clearLocalUserData();

  expect(storage.multiRemove).not.toHaveBeenCalled();
});

it('runs every registered cleaner, even after another one fails', async () => {
  storage.getAllKeys.mockResolvedValue([]);
  const failing = jest.fn().mockRejectedValue(new Error('disk'));
  const working = jest.fn();
  const unregisterFailing = registerLocalDataCleaner(failing);
  const unregisterWorking = registerLocalDataCleaner(working);

  await expect(clearLocalUserData()).resolves.toBeUndefined();

  expect(failing).toHaveBeenCalledTimes(1);
  expect(working).toHaveBeenCalledTimes(1);
  unregisterFailing();
  unregisterWorking();
});

it('stops calling a cleaner once it is unregistered', async () => {
  storage.getAllKeys.mockResolvedValue([]);
  const cleaner = jest.fn();
  registerLocalDataCleaner(cleaner)();

  await clearLocalUserData();

  expect(cleaner).not.toHaveBeenCalled();
});

it('still runs the cleaners when the storage cannot be read', async () => {
  storage.getAllKeys.mockRejectedValue(new Error('storage'));
  const cleaner = jest.fn();
  const unregister = registerLocalDataCleaner(cleaner);

  await clearLocalUserData();

  expect(cleaner).toHaveBeenCalledTimes(1);
  unregister();
});
