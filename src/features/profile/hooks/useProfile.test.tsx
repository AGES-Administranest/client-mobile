import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { NetworkError } from 'shared/api';
import { ApiError } from 'shared/services/apiClient';
import { isOnline } from 'shared/services/network';

import { useProfile, type UseProfileResult } from './useProfile';
import type { Profile } from '../domain/profile';
import { loadCachedProfile, saveCachedProfile } from '../services/profileCache';
import { fetchProfile } from '../services/profileService';

jest.mock('../services/profileService', () => ({ fetchProfile: jest.fn() }));
jest.mock('shared/services/network', () => ({ isOnline: jest.fn() }));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const isOnlineMock = isOnline as jest.MockedFunction<typeof isOnline>;

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const PROFILE: Profile = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  crmv: 'RS-12345',
  birthDate: null,
  sex: null,
  city: 'Porto Alegre',
  state: 'RS',
};

const SAVED: Profile = { ...PROFILE, city: 'Pelotas' };

async function renderProfileHook() {
  const result = { current: null as unknown as UseProfileResult };

  function Harness() {
    result.current = useProfile();
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });

  return { result, renderer };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  fetchMock.mockReset();
  isOnlineMock.mockReset();
  isOnlineMock.mockResolvedValue(true);
});

describe('online', () => {
  it('shows what the API answered and saves it for later', async () => {
    fetchMock.mockResolvedValue(PROFILE);

    const { result } = await renderProfileHook();

    expect(fetchMock).toHaveBeenCalledWith('id-token');
    expect(result.current.state).toEqual({
      status: 'ready',
      profile: PROFILE,
      isStale: false,
    });
    await expect(loadCachedProfile('user-1')).resolves.toEqual(PROFILE);
  });

  it('replaces the saved profile with the fresh one', async () => {
    await saveCachedProfile('user-1', SAVED);
    fetchMock.mockResolvedValue(PROFILE);

    const { result } = await renderProfileHook();

    expect(result.current.state).toMatchObject({ profile: PROFILE });
    await expect(loadCachedProfile('user-1')).resolves.toEqual(PROFILE);
  });

  it('shows the saved profile while the request is on its way', async () => {
    await saveCachedProfile('user-1', SAVED);
    fetchMock.mockReturnValue(new Promise(() => undefined));

    const { result } = await renderProfileHook();

    expect(result.current.state).toEqual({
      status: 'ready',
      profile: SAVED,
      isStale: false,
    });
  });

  it.each([
    ['the request gets no answer', new NetworkError('offline', null)],
    ['the API fails', new Error('HTTP 500')],
  ])('falls back to the saved profile when %s', async (_case, failure) => {
    await saveCachedProfile('user-1', SAVED);
    fetchMock.mockRejectedValue(failure);

    const { result } = await renderProfileHook();

    expect(result.current.state).toEqual({
      status: 'ready',
      profile: SAVED,
      isStale: true,
    });
  });

  it.each([
    ['an expired token', 'TOKEN_EXPIRED'],
    ['an account with no mirror', 'USER_NOT_PROVISIONED'],
  ])(
    'asks to sign in again on %s instead of showing the saved profile',
    async (_case, code) => {
      await saveCachedProfile('user-1', SAVED);
      fetchMock.mockRejectedValue(new ApiError('rejected', code, 401));

      const { result } = await renderProfileHook();

      expect(result.current.state).toEqual({ status: 'sessionExpired' });
    },
  );

  it('fails when the API fails and nothing was saved', async () => {
    fetchMock.mockRejectedValue(new Error('HTTP 500'));

    const { result } = await renderProfileHook();

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('does not save a response that lands after the screen closed', async () => {
    let answer!: (profile: Profile) => void;
    fetchMock.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );

    const { renderer } = await renderProfileHook();
    act(() => renderer.unmount());
    await act(async () => answer(PROFILE));

    await expect(loadCachedProfile('user-1')).resolves.toBeNull();
  });
});

describe('offline', () => {
  beforeEach(() => {
    isOnlineMock.mockResolvedValue(false);
  });

  it('shows the saved profile as possibly outdated, without calling the API', async () => {
    await saveCachedProfile('user-1', SAVED);

    const { result } = await renderProfileHook();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({
      status: 'ready',
      profile: SAVED,
      isStale: true,
    });
  });

  it('fails when nothing was saved', async () => {
    const { result } = await renderProfileHook();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('tries again on reload, once the connection is back', async () => {
    const { result } = await renderProfileHook();
    expect(result.current.state).toEqual({ status: 'error' });

    isOnlineMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(PROFILE);
    await act(async () => result.current.reload());

    expect(result.current.state).toEqual({
      status: 'ready',
      profile: PROFILE,
      isStale: false,
    });
  });
});
