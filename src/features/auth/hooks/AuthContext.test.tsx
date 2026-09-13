import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, useAuth } from './AuthContext';
import { Account, TERMS_VERSION } from '../domain/account';
import { AuthError } from '../domain/authErrors';
import * as accountApi from '../services/accountApi';
import * as authService from '../services/authService';
import * as socialAuthService from '../services/socialAuthService';

jest.mock('../services/authService');
jest.mock('../services/accountApi');
jest.mock('../services/socialAuthService');

const service = jest.mocked(authService);
const api = jest.mocked(accountApi);
const social = jest.mocked(socialAuthService);

const SESSION = {
  idToken: 'id',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: null,
  termsVersion: null,
};

const ACCEPTED: Account = {
  ...ACCOUNT,
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

async function renderProvider(
  initialSession = null as typeof SESSION | null,
  initialAccount = null as Account | null,
) {
  const auth = { current: undefined as ReturnType<typeof useAuth> | undefined };

  function Probe() {
    auth.current = useAuth();
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={initialSession}
        initialAccount={initialAccount}
      >
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
  expect(auth.current!.account).toBeNull();
});

it('leaves the session empty when Cognito refuses the sign in', async () => {
  service.signIn.mockRejectedValue(new Error('boom'));
  const auth = await renderProvider();

  await act(async () => {
    await expect(auth.current!.signIn('a@b.co', 'x')).rejects.toThrow('boom');
  });

  expect(auth.current!.session).toBeNull();
  expect(api.createSession).not.toHaveBeenCalled();
});

it('opens the account in the API with the id token before exposing the session', async () => {
  service.signIn.mockResolvedValue(SESSION);
  api.createSession.mockResolvedValue(ACCOUNT);
  const auth = await renderProvider();

  await act(async () => {
    await auth.current!.signIn(' bruna@example.com ', 'Senha@1234');
  });

  expect(service.signIn).toHaveBeenCalledWith(
    'bruna@example.com',
    'Senha@1234',
  );
  expect(api.createSession).toHaveBeenCalledWith('id');
  expect(auth.current!.session).toEqual(SESSION);
  expect(auth.current!.account).toEqual(ACCOUNT);
  expect(api.acceptTerms).not.toHaveBeenCalled();
});

it('gives the tokens back and stays signed out when the API refuses the account', async () => {
  service.signIn.mockResolvedValue(SESSION);
  service.signOut.mockResolvedValue();
  api.createSession.mockRejectedValue(
    new AuthError('ACCOUNT_USES_OTHER_SIGN_IN'),
  );
  const auth = await renderProvider();

  await act(async () => {
    await expect(
      auth.current!.signIn('bruna@example.com', 'Senha@1234'),
    ).rejects.toMatchObject({ code: 'ACCOUNT_USES_OTHER_SIGN_IN' });
  });

  expect(service.signOut).toHaveBeenCalledWith(SESSION);
  expect(auth.current!.session).toBeNull();
  expect(auth.current!.account).toBeNull();
});

it('records the terms right away when the sign-up flow already accepted them', async () => {
  service.signIn.mockResolvedValue(SESSION);
  api.createSession.mockResolvedValue(ACCOUNT);
  api.acceptTerms.mockResolvedValue(ACCEPTED);
  const auth = await renderProvider();

  await act(async () => {
    await auth.current!.signIn('bruna@example.com', 'Senha@1234', {
      acceptTerms: true,
    });
  });

  expect(api.acceptTerms).toHaveBeenCalledWith('id', TERMS_VERSION);
  expect(auth.current!.account).toEqual(ACCEPTED);
});

it('keeps a working sign in when recording the terms fails', async () => {
  service.signIn.mockResolvedValue(SESSION);
  api.createSession.mockResolvedValue(ACCOUNT);
  api.acceptTerms.mockRejectedValue(new AuthError('NETWORK_UNAVAILABLE'));
  const auth = await renderProvider();

  await act(async () => {
    await auth.current!.signIn('bruna@example.com', 'Senha@1234', {
      acceptTerms: true,
    });
  });

  expect(auth.current!.session).toEqual(SESSION);
  expect(auth.current!.account).toEqual(ACCOUNT);
});

it('opens the account after a Google sign in, and not after a cancelled one', async () => {
  social.signInWithProvider.mockResolvedValueOnce(null);
  const auth = await renderProvider();

  await act(async () => {
    await expect(auth.current!.signInWithProvider('Google')).resolves.toBe(
      false,
    );
  });
  expect(api.createSession).not.toHaveBeenCalled();

  social.signInWithProvider.mockResolvedValueOnce(SESSION);
  api.createSession.mockResolvedValue(ACCOUNT);

  await act(async () => {
    await expect(auth.current!.signInWithProvider('Google')).resolves.toBe(
      true,
    );
  });
  expect(auth.current!.account).toEqual(ACCOUNT);
});

it('accepts the current terms version for the signed-in account', async () => {
  api.acceptTerms.mockResolvedValue(ACCEPTED);
  const auth = await renderProvider(SESSION, ACCOUNT);

  await act(async () => {
    await auth.current!.acceptTerms();
  });

  expect(api.acceptTerms).toHaveBeenCalledWith('id', TERMS_VERSION);
  expect(auth.current!.account).toEqual(ACCEPTED);
});

it('clears session and account locally even if revoking the token fails', async () => {
  service.signOut.mockRejectedValue(new Error('offline'));
  const auth = await renderProvider(SESSION, ACCEPTED);

  await act(async () => {
    await auth.current!.signOut();
  });

  expect(service.signOut).toHaveBeenCalledWith(SESSION);
  expect(auth.current!.session).toBeNull();
  expect(auth.current!.account).toBeNull();
});
