import { AuthRequest, exchangeCodeAsync, TokenError } from 'expo-auth-session';

import { signInWithProvider } from './socialAuthService';
import { AuthError } from '../domain/authErrors';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));

const mockPromptAsync = jest.fn();

jest.mock('expo-auth-session', () => {
  class MockTokenError extends Error {
    description?: string;

    constructor(description?: string) {
      super('token error');
      this.description = description;
    }
  }

  return {
    AuthRequest: jest.fn().mockImplementation(() => ({
      promptAsync: (...args: unknown[]) => mockPromptAsync(...args),
      codeVerifier: 'verifier-123',
    })),
    exchangeCodeAsync: jest.fn(),
    makeRedirectUri: jest.fn(() => 'administranest://auth/callback'),
    ResponseType: { Code: 'code' },
    TokenError: MockTokenError,
  };
});

const NOW = 1_700_000_000_000;
const mockExchange = jest.mocked(exchangeCodeAsync);
const mockAuthRequest = jest.mocked(AuthRequest);

const TOKENS = {
  idToken: 'id',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 3600,
};

beforeAll(() => {
  process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID = 'test-client';
  process.env.EXPO_PUBLIC_COGNITO_OAUTH_URL = 'http://localhost:4566/';
});

beforeEach(() => {
  mockPromptAsync.mockReset();
  mockExchange.mockReset();
  mockAuthRequest.mockClear();
});

function authorizeWith(params: Record<string, string>) {
  mockPromptAsync.mockResolvedValue({ type: 'success', params });
}

describe('signInWithProvider', () => {
  it('asks Cognito for the provider with the code flow and PKCE', async () => {
    authorizeWith({ code: 'the-code' });
    mockExchange.mockResolvedValue(TOKENS as never);

    await signInWithProvider('Google', () => NOW);

    expect(mockAuthRequest).toHaveBeenCalledWith({
      clientId: 'test-client',
      redirectUri: 'administranest://auth/callback',
      responseType: 'code',
      scopes: ['openid', 'email', 'profile'],
      usePKCE: true,
      extraParams: { identity_provider: 'Google' },
    });
    expect(mockPromptAsync).toHaveBeenCalledWith(
      { authorizationEndpoint: 'http://localhost:4566/oauth2/authorize' },
      { preferEphemeralSession: true },
    );
  });

  it('redeems the code with the same verifier and redirect uri', async () => {
    authorizeWith({ code: 'the-code' });
    mockExchange.mockResolvedValue(TOKENS as never);

    await expect(signInWithProvider('Google', () => NOW)).resolves.toEqual({
      idToken: 'id',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: NOW + 3_600_000,
    });

    expect(mockExchange).toHaveBeenCalledWith(
      {
        clientId: 'test-client',
        code: 'the-code',
        redirectUri: 'administranest://auth/callback',
        extraParams: { code_verifier: 'verifier-123' },
      },
      { tokenEndpoint: 'http://localhost:4566/oauth2/token' },
    );
  });

  it('resolves to null and never exchanges when the user closes the browser', async () => {
    mockPromptAsync.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithProvider('Google', () => NOW)).resolves.toBeNull();
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it('reports a code Cognito refuses as UNKNOWN', async () => {
    authorizeWith({ code: 'stale' });
    mockExchange.mockRejectedValue(new TokenError('invalid_grant' as never));

    await expect(signInWithProvider('Google', () => NOW)).rejects.toMatchObject(
      { code: 'UNKNOWN' },
    );
  });

  it('reports a token request that never got an answer as NETWORK_UNAVAILABLE', async () => {
    authorizeWith({ code: 'the-code' });
    mockExchange.mockRejectedValue(new TypeError('Network request failed'));

    await expect(signInWithProvider('Google', () => NOW)).rejects.toMatchObject(
      { code: 'NETWORK_UNAVAILABLE' },
    );
  });

  it('turns a browser that fails to open into an AuthError', async () => {
    mockPromptAsync.mockRejectedValue(new Error('no browser'));

    await expect(
      signInWithProvider('Google', () => NOW),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
