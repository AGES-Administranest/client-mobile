import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, useAuth } from './AuthContext';
import * as authService from '../services/authService';

jest.mock('../services/authService');

const service = jest.mocked(authService);

const SESSION = {
  idToken: 'id',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

async function renderProvider(initialSession = null as typeof SESSION | null) {
  const auth = { current: undefined as ReturnType<typeof useAuth> | undefined };

  function Probe() {
    auth.current = useAuth();
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={initialSession}>
        <Probe />
      </AuthProvider>,
    );
  });

  return auth;
}

beforeEach(() => jest.resetAllMocks());

it('starts signed out', async () => {
  const auth = await renderProvider();

  expect(auth.current!.session).toBeNull();
});

it('leaves the session empty when signIn fails', async () => {
  service.signIn.mockRejectedValue(new Error('boom'));
  const auth = await renderProvider();

  await act(async () => {
    await expect(auth.current!.signIn('a@b.co', 'x')).rejects.toThrow('boom');
  });

  expect(auth.current!.session).toBeNull();
});

it('clears the session locally even if revoking the token fails', async () => {
  service.signOut.mockRejectedValue(new Error('offline'));
  const auth = await renderProvider(SESSION);

  await act(async () => {
    await auth.current!.signOut();
  });

  expect(service.signOut).toHaveBeenCalledWith(SESSION);
  expect(auth.current!.session).toBeNull();
});
