import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearSession, loadSession, saveSession } from './sessionStorage';

const SESSION = {
  idToken: 'id',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1_700_000_000_000,
};

beforeEach(() => AsyncStorage.clear());

it('gives back the session it saved', async () => {
  await saveSession(SESSION);

  await expect(loadSession()).resolves.toEqual(SESSION);
});

it('has nothing before a sign in', async () => {
  await expect(loadSession()).resolves.toBeNull();
});

it('forgets the session once cleared', async () => {
  await saveSession(SESSION);
  await clearSession();

  await expect(loadSession()).resolves.toBeNull();
});

it.each([
  ['not JSON', '{oops'],
  ['a missing token', JSON.stringify({ ...SESSION, refreshToken: undefined })],
  ['a non-numeric expiry', JSON.stringify({ ...SESSION, expiresAt: 'soon' })],
  ['a bare string', JSON.stringify('id')],
])('ignores stored data with %s', async (_label, raw) => {
  await AsyncStorage.setItem('@administranest:auth:session', raw);

  await expect(loadSession()).resolves.toBeNull();
});
