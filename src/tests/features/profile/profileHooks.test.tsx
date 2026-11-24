import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { act } from 'react-test-renderer';

import { loadSignUpProfile } from 'features/auth';
import {
  clearSignUpProfile,
  saveSignUpProfile,
} from 'features/auth/services/signUpProfileStore';
import { useApplySignUpProfile } from 'features/profile/hooks/useApplySignUpProfile';
import { useProfileSync } from 'features/profile/hooks/useProfileSync';
import {
  loadCachedProfile,
  savePendingProfileEdit,
  subscribeProfileChanges,
} from 'features/profile/services/profileCache';
import { updateProfile } from 'features/profile/services/profileService';
import { ApiError } from 'shared/services/apiClient';
import { onConnectionRestored } from 'shared/services/network';

import { renderHook } from '../../support/renderHook';

const EMAIL = 'bruna@example.com';
const mockAuth = {
  session: { idToken: 'token' } as { idToken: string } | null,
  account: { id: 'user-1', email: 'bruna@example.com' },
};

jest.mock('features/auth', () => ({
  ...jest.requireActual('features/auth/services/signUpProfileStore'),
  useAuth: () => mockAuth,
}));
jest.mock('features/profile/services/profileService', () => ({
  updateProfile: jest.fn(),
}));
jest.mock('shared/services/network', () => ({
  onConnectionRestored: jest.fn(),
}));

const update = jest.mocked(updateProfile);
const PROFILE = { id: 'user-1', name: 'Bruna', crmv: 'RS-123' } as never;

const settle = () =>
  act(async () => {
    await new Promise<void>(resolve => setImmediate(() => resolve()));
  });

beforeEach(async () => {
  update.mockReset().mockResolvedValue(PROFILE);
  mockAuth.session = { idToken: 'token' };
  jest.mocked(onConnectionRestored).mockReset().mockReturnValue(jest.fn());
  await AsyncStorage.clear();
});

describe('the profile typed at sign-up', () => {
  it('is found whatever the case and spaces of the e-mail', async () => {
    await saveSignUpProfile(' Bruna@Example.com', { crmv: 'RS-1', sex: null });

    await expect(loadSignUpProfile(EMAIL)).resolves.toEqual({
      crmv: 'RS-1',
      sex: null,
    });
  });

  it('is not kept when nothing was typed', async () => {
    await saveSignUpProfile(EMAIL, { crmv: null, sex: null });

    await expect(loadSignUpProfile(EMAIL)).resolves.toBeNull();
  });

  it('does not stop the sign-up when the device fails', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('full'));
    await saveSignUpProfile(EMAIL, { crmv: 'RS-1', sex: null });
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('broke'));
    await expect(loadSignUpProfile(EMAIL)).resolves.toBeNull();
    jest
      .mocked(AsyncStorage.removeItem)
      .mockRejectedValueOnce(new Error('broke'));
    await expect(clearSignUpProfile(EMAIL)).resolves.toBeUndefined();
  });
});

describe('useApplySignUpProfile', () => {
  it('sends what was typed once, and tells who shows the profile', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeProfileChanges(listener);
    await saveSignUpProfile(EMAIL, { crmv: 'RS-123', sex: 'FEMALE' });

    await renderHook(useApplySignUpProfile);
    await settle();

    expect(update).toHaveBeenCalledWith('token', {
      crmv: 'RS-123',
      sex: 'FEMALE',
    });
    await expect(loadSignUpProfile(EMAIL)).resolves.toBeNull();
    await expect(loadCachedProfile('user-1')).resolves.toEqual(PROFILE);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('sends only the fields that were typed', async () => {
    await saveSignUpProfile(EMAIL, { crmv: null, sex: 'MALE' });

    await renderHook(useApplySignUpProfile);
    await settle();

    expect(update).toHaveBeenCalledWith('token', { sex: 'MALE' });
  });

  it('has nothing to send for who typed nothing, or is signed out', async () => {
    await renderHook(useApplySignUpProfile);
    await saveSignUpProfile(EMAIL, { crmv: 'RS-123', sex: null });
    mockAuth.session = null;
    await renderHook(useApplySignUpProfile);
    await settle();

    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['dropped', new ApiError('refused', 'VALIDATION_ERROR', 400), null],
    ['kept', new TypeError('Network request failed'), 'RS-123'],
    ['kept', new ApiError('expired', null, 401), 'RS-123'],
    ['kept', new ApiError('broke', null, 500), 'RS-123'],
  ])('is %s when sending fails with %s', async (_case, failure, crmv) => {
    update.mockRejectedValue(failure);
    await saveSignUpProfile(EMAIL, { crmv: 'RS-123', sex: null });

    await renderHook(useApplySignUpProfile);
    await settle();

    expect((await loadSignUpProfile(EMAIL))?.crmv ?? null).toBe(crmv);
  });
});

describe('useProfileSync', () => {
  let onAppState: (state: string) => void;
  const removeAppState = jest.fn();

  beforeEach(async () => {
    removeAppState.mockReset();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockClear()
      .mockImplementation((_event, listener) => {
        onAppState = listener as (state: string) => void;
        return { remove: removeAppState } as never;
      });
  });
  afterEach(() => jest.useRealTimers());

  const keepPending = () => {
    update.mockRejectedValue(new TypeError('Network request failed'));
    return savePendingProfileEdit('user-1', {
      update: { name: 'Bruna' } as never,
      confirmed: PROFILE,
    });
  };

  it('tries when the app opens, comes back and reconnects', async () => {
    await keepPending();
    await renderHook(useProfileSync);
    await settle();
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => onAppState('background'));
    await settle();
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => onAppState('active'));
    await settle();
    expect(update).toHaveBeenCalledTimes(2);

    const [onConnection] = jest.mocked(onConnectionRestored).mock.calls[0];
    await act(async () => onConnection());
    await settle();
    expect(update).toHaveBeenCalledTimes(3);
  });

  it('retries every 30 seconds only while an edit is pending', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    await renderHook(useProfileSync);
    await settle();

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    await settle();
    expect(update).not.toHaveBeenCalled();

    await keepPending();
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    await settle();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('listens to nothing while signed out, and stops when it is gone', async () => {
    mockAuth.session = null;
    await renderHook(useProfileSync);
    expect(AppState.addEventListener).not.toHaveBeenCalled();

    mockAuth.session = { idToken: 'token' };
    const stopConnection = jest.fn();
    jest.mocked(onConnectionRestored).mockReturnValue(stopConnection);
    (await renderHook(useProfileSync)).unmount();

    expect(removeAppState).toHaveBeenCalledTimes(1);
    expect(stopConnection).toHaveBeenCalledTimes(1);
  });
});
