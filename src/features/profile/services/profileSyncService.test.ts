import AsyncStorage from '@react-native-async-storage/async-storage';

import { NetworkError } from 'shared/api';
import { ApiError } from 'shared/services/apiClient';

import {
  loadCachedProfile,
  loadPendingProfileEdit,
  loadProfileRejected,
  queueProfileEdit,
} from './profileCache';
import { updateProfile } from './profileService';
import { syncPendingProfile } from './profileSyncService';
import type { Profile } from '../domain/profile';

jest.mock('./profileService', () => ({ updateProfile: jest.fn() }));

const updateMock = updateProfile as jest.MockedFunction<typeof updateProfile>;

const USER = 'user-1';

const CONFIRMED: Profile = {
  id: USER,
  name: 'Ana Souza',
  email: 'ana@example.com',
  crmv: 'RS-12345',
  birthDate: '1990-04-15T00:00:00.000Z',
  sex: 'FEMALE',
  city: 'Porto Alegre',
  state: 'RS',
};

const UPDATE = {
  name: 'Ana Souza',
  crmv: 'RS-12345',
  birthDate: '1990-04-15',
  sex: 'FEMALE' as const,
  city: 'Canoas',
  state: 'RS',
};

beforeEach(async () => {
  updateMock.mockReset();
  await AsyncStorage.clear();
  await queueProfileEdit(USER, UPDATE, CONFIRMED);
});

it('keeps the edit on the device right away', async () => {
  expect((await loadCachedProfile(USER))?.city).toBe('Canoas');
  expect(await loadPendingProfileEdit(USER)).toEqual({
    update: UPDATE,
    confirmed: CONFIRMED,
  });
});

it('keeps only the last edit, rolling back to the first confirmed profile', async () => {
  const edited = await loadCachedProfile(USER);
  await queueProfileEdit(USER, { ...UPDATE, city: 'Gravataí' }, edited!);

  expect(await loadPendingProfileEdit(USER)).toEqual({
    update: { ...UPDATE, city: 'Gravataí' },
    confirmed: CONFIRMED,
  });
});

it('sends the pending edit and keeps what the server answered', async () => {
  updateMock.mockResolvedValue({ ...CONFIRMED, city: 'Canoas' });

  await expect(syncPendingProfile('token', USER)).resolves.toBe('synced');

  expect(updateMock).toHaveBeenCalledWith('token', UPDATE);
  expect(await loadPendingProfileEdit(USER)).toBeNull();
  expect((await loadCachedProfile(USER))?.city).toBe('Canoas');
  expect(await loadProfileRejected(USER)).toBe(false);
});

it('on a rejection, goes back to the confirmed profile and tells the user', async () => {
  updateMock.mockRejectedValue(
    new ApiError('invalid', 'VALIDATION_ERROR', 400),
  );

  await expect(syncPendingProfile('token', USER)).resolves.toBe('rejected');

  expect(await loadPendingProfileEdit(USER)).toBeNull();
  expect(await loadCachedProfile(USER)).toEqual(CONFIRMED);
  expect(await loadProfileRejected(USER)).toBe(true);
});

it.each([
  ['no network', new NetworkError('offline', new TypeError('failed'))],
  ['an expired session', new ApiError('expired', 'TOKEN_EXPIRED', 401)],
  ['a server failure', new ApiError('boom', 'INTERNAL', 500)],
])('with %s, keeps the edit pending', async (_case, error) => {
  updateMock.mockRejectedValue(error);

  await expect(syncPendingProfile('token', USER)).resolves.toBe('pending');

  expect(await loadPendingProfileEdit(USER)).not.toBeNull();
  expect((await loadCachedProfile(USER))?.city).toBe('Canoas');
  expect(await loadProfileRejected(USER)).toBe(false);
});

describe('with a newer edit queued while sending', () => {
  const NEWER = { ...UPDATE, city: 'Gravataí' };

  async function queueNewerDuringSend() {
    const edited = await loadCachedProfile(USER);
    await queueProfileEdit(USER, NEWER, edited!);
  }

  it('keeps the newer edit, now rolling back to what the server accepted', async () => {
    const accepted = { ...CONFIRMED, city: 'Canoas' };
    updateMock.mockImplementation(async () => {
      await queueNewerDuringSend();
      return accepted;
    });

    await expect(syncPendingProfile('token', USER)).resolves.toBe('synced');

    expect(await loadPendingProfileEdit(USER)).toEqual({
      update: NEWER,
      confirmed: accepted,
    });
    expect((await loadCachedProfile(USER))?.city).toBe('Gravataí');
  });

  it('does not let the refused one drop the newer edit', async () => {
    updateMock.mockImplementation(async () => {
      await queueNewerDuringSend();
      throw new ApiError('invalid', 'VALIDATION_ERROR', 400);
    });

    await expect(syncPendingProfile('token', USER)).resolves.toBe('pending');

    expect((await loadPendingProfileEdit(USER))?.update).toEqual(NEWER);
    expect((await loadCachedProfile(USER))?.city).toBe('Gravataí');
    expect(await loadProfileRejected(USER)).toBe(false);
  });
});

it('does nothing when there is no pending edit', async () => {
  await AsyncStorage.clear();

  await expect(syncPendingProfile('token', USER)).resolves.toBe('idle');
  expect(updateMock).not.toHaveBeenCalled();
});
