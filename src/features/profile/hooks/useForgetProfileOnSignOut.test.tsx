import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  useAuth,
  type Account,
} from 'features/auth';

import { useForgetProfileOnSignOut } from './useForgetProfileOnSignOut';
import type { Profile } from '../domain/profile';
import { loadCachedProfile, saveCachedProfile } from '../services/profileCache';

jest.mock('features/auth/services/authService', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

let signOut: () => Promise<void>;

function Harness() {
  useForgetProfileOnSignOut();
  signOut = useAuth().signOut;
  return null;
}

async function renderHarness() {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

// The same signOut the terms screen calls, not only the Home menu's.
it('forgets the saved profile whenever the account signs out', async () => {
  await saveCachedProfile('user-1', PROFILE);
  await renderHarness();

  await act(async () => {
    await signOut();
  });

  await expect(loadCachedProfile('user-1')).resolves.toBeNull();
});

it('keeps the saved profile while the account stays signed in', async () => {
  await saveCachedProfile('user-1', PROFILE);

  await renderHarness();

  await expect(loadCachedProfile('user-1')).resolves.toEqual(PROFILE);
});
