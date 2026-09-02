import { forgotPassword, refreshSession, signIn, signUp } from './authService';
import { AuthError } from '../domain/authErrors';
import { AuthSession } from '../domain/session';

const NOW = 1_700_000_000_000;
const mockFetch = jest.fn();

beforeAll(() => {
  process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID = 'test-client';
  process.env.EXPO_PUBLIC_COGNITO_ENDPOINT = 'http://localhost:4566';
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(() => mockFetch.mockReset());

function respondWith(body: unknown, ok = true) {
  mockFetch.mockResolvedValue({ ok, json: () => Promise.resolve(body) });
}

function signInResponse() {
  return {
    AuthenticationResult: {
      IdToken: 'id',
      AccessToken: 'access',
      RefreshToken: 'refresh',
      ExpiresIn: 3600,
    },
  };
}

function lastRequest() {
  const [url, init] = mockFetch.mock.calls[0];

  return {
    url,
    target: init.headers['X-Amz-Target'],
    body: JSON.parse(init.body),
  };
}

describe('signIn', () => {
  it('builds the session from AuthenticationResult', async () => {
    respondWith(signInResponse());

    await expect(signIn('ana@example.com', 'Passw0rd@', NOW)).resolves.toEqual({
      idToken: 'id',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: NOW + 3_600_000,
    });
  });

  it('posts to the configured endpoint with the operation in the header', async () => {
    respondWith(signInResponse());

    await signIn('ana@example.com', 'Passw0rd@', NOW);
    const request = lastRequest();

    expect(request.url).toBe('http://localhost:4566');
    expect(request.target).toBe(
      'AWSCognitoIdentityProviderService.InitiateAuth',
    );
    expect(request.body).toMatchObject({
      ClientId: 'test-client',
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: 'ana@example.com', PASSWORD: 'Passw0rd@' },
    });
  });

  it('reports invalid credentials without leaking which field was wrong', async () => {
    respondWith({ __type: 'UserNotFoundException' }, false);

    await expect(signIn('ana@example.com', 'wrong', NOW)).rejects.toMatchObject(
      { code: 'INVALID_CREDENTIALS' },
    );
  });

  it('reports NETWORK_UNAVAILABLE when the request never leaves', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    await expect(
      signIn('ana@example.com', 'Passw0rd@', NOW),
    ).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' });
  });
});

describe('signUp', () => {
  it('sends e-mail and name as user attributes', async () => {
    respondWith({ UserSub: 'sub-123', UserConfirmed: false });

    const result = await signUp('ana@example.com', 'Passw0rd@', 'Ana Souza');

    expect(result).toEqual({ userSub: 'sub-123', isConfirmed: false });
    expect(lastRequest().body.UserAttributes).toEqual([
      { Name: 'email', Value: 'ana@example.com' },
      { Name: 'name', Value: 'Ana Souza' },
    ]);
  });

  it('reports an already registered e-mail', async () => {
    respondWith({ __type: 'UsernameExistsException' }, false);

    await expect(
      signUp('ana@example.com', 'Passw0rd@', 'Ana'),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });
});

describe('refreshSession', () => {
  const current: AuthSession = {
    idToken: 'old-id',
    accessToken: 'old-access',
    refreshToken: 'live-refresh',
    expiresAt: NOW,
  };

  it('keeps the refresh token the response leaves out', async () => {
    respondWith({
      AuthenticationResult: {
        IdToken: 'new-id',
        AccessToken: 'new-access',
        ExpiresIn: 3600,
      },
    });

    await expect(refreshSession(current, NOW)).resolves.toEqual({
      idToken: 'new-id',
      accessToken: 'new-access',
      refreshToken: 'live-refresh',
      expiresAt: NOW + 3_600_000,
    });
  });

  it('signals an expired session when the refresh token is spent', async () => {
    respondWith({});

    await expect(refreshSession(current, NOW)).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });
});

describe('forgotPassword', () => {
  // If this test fails, the "forgot password" form starts telling the world
  // which e-mails have an account.
  it('treats an unknown e-mail as success', async () => {
    respondWith({ __type: 'UserNotFoundException' }, false);

    await expect(forgotPassword('nobody@example.com')).resolves.toBeUndefined();
  });

  it('still propagates errors that are not about existence', async () => {
    respondWith({ __type: 'TooManyRequestsException' }, false);

    await expect(forgotPassword('ana@example.com')).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});
