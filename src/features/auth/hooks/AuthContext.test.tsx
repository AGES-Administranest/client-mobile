import ReactTestRenderer, { act } from 'react-test-renderer';

import { clearLocalUserData } from 'shared/services/localData';

import { AuthProvider, useAuth } from './AuthContext';
import { Account, TERMS_VERSION } from '../domain/account';
import { AuthError } from '../domain/authErrors';
import * as accountApi from '../services/accountApi';
import * as authService from '../services/authService';
import * as sessionStorage from '../services/sessionStorage';
import * as socialAuthService from '../services/socialAuthService';

jest.mock('../services/authService');
jest.mock('../services/accountApi');
jest.mock('../services/sessionStorage');
jest.mock('../services/socialAuthService');
jest.mock('shared/services/localData', () => ({
  clearLocalUserData: jest.fn().mockResolvedValue(undefined),
}));

const storage = jest.mocked(sessionStorage);

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

describe('keeping the sign in across launches', () => {
  const FRESH = { ...SESSION, expiresAt: Date.now() + 60 * 60 * 1000 };
  const REFRESHED = { ...SESSION, idToken: 'id-2', expiresAt: Date.now() };

  it('saves the session once the account opens', async () => {
    service.signIn.mockResolvedValue(SESSION);
    api.createSession.mockResolvedValue(ACCEPTED);
    const auth = await renderProvider();

    await act(async () => {
      await auth.current!.signIn('bruna@example.com', 'secret');
    });

    expect(storage.saveSession).toHaveBeenCalledWith(SESSION);
  });

  it('forgets the saved session on sign out', async () => {
    service.signOut.mockResolvedValue(undefined);
    const auth = await renderProvider(SESSION, ACCEPTED);

    await act(async () => {
      await auth.current!.signOut();
    });

    expect(storage.clearSession).toHaveBeenCalled();
  });

  it('brings back a saved session that is still valid', async () => {
    storage.loadSession.mockResolvedValue(FRESH);
    api.createSession.mockResolvedValue(ACCEPTED);
    const auth = await renderProvider();

    expect(service.refreshSession).not.toHaveBeenCalled();
    expect(api.createSession).toHaveBeenCalledWith(FRESH.idToken);
    expect(auth.current!.session).toEqual(FRESH);
    expect(auth.current!.account).toEqual(ACCEPTED);
    expect(auth.current!.restoring).toBe(false);
  });

  it('refreshes an expired saved session before opening the account', async () => {
    storage.loadSession.mockResolvedValue(SESSION);
    service.refreshSession.mockResolvedValue(REFRESHED);
    api.createSession.mockResolvedValue(ACCEPTED);
    const auth = await renderProvider();

    expect(service.refreshSession).toHaveBeenCalledWith(SESSION);
    expect(api.createSession).toHaveBeenCalledWith('id-2');
    expect(auth.current!.session).toEqual(REFRESHED);
    expect(storage.saveSession).toHaveBeenCalledWith(REFRESHED);
  });

  it('drops a saved session the refresh token no longer opens', async () => {
    storage.loadSession.mockResolvedValue(SESSION);
    service.refreshSession.mockRejectedValue(new AuthError('SESSION_EXPIRED'));
    const auth = await renderProvider();

    expect(auth.current!.session).toBeNull();
    expect(storage.clearSession).toHaveBeenCalled();
    expect(auth.current!.restoring).toBe(false);
  });

  it('keeps the saved session when the device is offline', async () => {
    storage.loadSession.mockResolvedValue(FRESH);
    api.createSession.mockRejectedValue(new AuthError('NETWORK_UNAVAILABLE'));
    const auth = await renderProvider();

    expect(auth.current!.session).toBeNull();
    expect(storage.clearSession).not.toHaveBeenCalled();
  });

  it('does not look for a saved session when one is handed in', async () => {
    await renderProvider(SESSION, ACCEPTED);

    expect(storage.loadSession).not.toHaveBeenCalled();
  });
});

describe('deleting the account', () => {
  const FRESH = {
    ...SESSION,
    idToken: 'id-fresh',
    accessToken: 'access-fresh',
  };

  beforeEach(() => {
    service.signIn.mockResolvedValue(FRESH);
    service.deleteUser.mockResolvedValue(undefined);
    api.deleteAccount.mockResolvedValue(undefined);
    storage.clearSession.mockResolvedValue(undefined);
    jest.mocked(clearLocalUserData).mockResolvedValue(undefined);
  });

  it('confirms the password, deletes with the new token and wipes the device', async () => {
    const auth = await renderProvider(SESSION, ACCEPTED);

    await act(async () => {
      await auth.current!.deleteAccount('Senha@1234');
    });

    expect(service.signIn).toHaveBeenCalledWith(
      'bruna@example.com',
      'Senha@1234',
    );
    expect(api.deleteAccount).toHaveBeenCalledWith('id-fresh');
    expect(service.deleteUser).toHaveBeenCalledWith(FRESH);
    expect(storage.clearSession).toHaveBeenCalled();
    expect(clearLocalUserData).toHaveBeenCalled();
  });

  it('keeps the session in memory until the deletion is finished', async () => {
    const auth = await renderProvider(SESSION, ACCEPTED);

    await act(async () => {
      await auth.current!.deleteAccount('Senha@1234');
    });
    expect(auth.current!.session).toEqual(SESSION);

    await act(async () => {
      await auth.current!.finishAccountDeletion();
    });
    expect(auth.current!.session).toBeNull();
    expect(auth.current!.account).toBeNull();
  });

  it('deletes nothing when the password is wrong', async () => {
    service.signIn.mockRejectedValue(new AuthError('INVALID_CREDENTIALS'));
    const auth = await renderProvider(SESSION, ACCEPTED);

    await act(async () => {
      await expect(auth.current!.deleteAccount('errada')).rejects.toMatchObject(
        { code: 'INVALID_CREDENTIALS' },
      );
    });

    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(clearLocalUserData).not.toHaveBeenCalled();
    expect(auth.current!.session).toEqual(SESSION);
  });

  it('keeps the data on the device when the API fails', async () => {
    api.deleteAccount.mockRejectedValue(new AuthError('NETWORK_UNAVAILABLE'));
    const auth = await renderProvider(SESSION, ACCEPTED);

    await act(async () => {
      await expect(
        auth.current!.deleteAccount('Senha@1234'),
      ).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' });
    });

    expect(service.deleteUser).not.toHaveBeenCalled();
    expect(clearLocalUserData).not.toHaveBeenCalled();
  });

  it('still succeeds when removing the Cognito user fails afterwards', async () => {
    service.deleteUser.mockRejectedValue(new AuthError('UNKNOWN'));
    const auth = await renderProvider(SESSION, ACCEPTED);

    await act(async () => {
      await auth.current!.deleteAccount('Senha@1234');
    });

    expect(clearLocalUserData).toHaveBeenCalled();
  });
});

it('wipes the local data on a plain sign out too', async () => {
  service.signOut.mockResolvedValue(undefined);
  const auth = await renderProvider(SESSION, ACCEPTED);

  await act(async () => {
    await auth.current!.signOut();
  });

  expect(clearLocalUserData).toHaveBeenCalled();
});
