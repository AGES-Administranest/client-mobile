import { AuthError } from './authErrors';
import { readAuthorizationResult, sessionFromTokens } from './socialSignIn';

const NOW = 1_700_000_000_000;

describe('readAuthorizationResult', () => {
  it('returns the code of a successful authorization', () => {
    expect(
      readAuthorizationResult({
        type: 'success',
        params: { code: 'abc', state: 's' },
      }),
    ).toEqual({ status: 'authorized', code: 'abc' });
  });

  it('fails when success comes back without a code', () => {
    expect(() =>
      readAuthorizationResult({ type: 'success', params: {} }),
    ).toThrow(AuthError);
  });

  it.each(['cancel', 'dismiss', 'opened', 'locked'] as const)(
    'treats a %s browser as the user giving up, not as an error',
    type => {
      expect(readAuthorizationResult({ type })).toEqual({
        status: 'cancelled',
      });
    },
  );

  it('treats access_denied as the user declining at the provider', () => {
    expect(
      readAuthorizationResult({
        type: 'error',
        params: { error: 'access_denied' },
      }),
    ).toEqual({ status: 'cancelled' });
  });

  it('turns any other provider error into UNKNOWN', () => {
    let caught: unknown;
    try {
      readAuthorizationResult({
        type: 'error',
        params: {
          error: 'invalid_request',
          error_description: 'redirect_uri mismatch',
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AuthError);
    expect((caught as AuthError).code).toBe('UNKNOWN');
    expect((caught as AuthError).message).toBe('redirect_uri mismatch');
  });
});

describe('sessionFromTokens', () => {
  const tokens = {
    idToken: 'id',
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresIn: 1800,
  };

  it('builds the same session shape as the password sign in', () => {
    expect(sessionFromTokens(tokens, NOW)).toEqual({
      idToken: 'id',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: NOW + 1_800_000,
    });
  });

  it('assumes Cognito one-hour tokens when expires_in is missing', () => {
    expect(
      sessionFromTokens({ ...tokens, expiresIn: undefined }, NOW).expiresAt,
    ).toBe(NOW + 3_600_000);
  });

  it('requires the id token, which is the one the API validates', () => {
    expect(() =>
      sessionFromTokens({ ...tokens, idToken: undefined }, NOW),
    ).toThrow(AuthError);
  });

  it('requires a refresh token', () => {
    expect(() =>
      sessionFromTokens({ ...tokens, refreshToken: undefined }, NOW),
    ).toThrow(AuthError);
  });
});
