import {
  AuthSession,
  REFRESH_SKEW_MS,
  isSessionExpired,
  shouldRefreshSession,
  withRefreshedTokens,
} from './session';

const NOW = 1_700_000_000_000;

function sessionExpiringIn(ms: number): AuthSession {
  return {
    idToken: 'id',
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: NOW + ms,
  };
}

describe('isSessionExpired', () => {
  it('holds while the deadline has not arrived', () => {
    expect(isSessionExpired(sessionExpiringIn(1), NOW)).toBe(false);
  });

  it('expires exactly at the deadline', () => {
    expect(isSessionExpired(sessionExpiringIn(0), NOW)).toBe(true);
  });
});

describe('shouldRefreshSession', () => {
  it('asks for a refresh before expiry, inside the skew window', () => {
    const session = sessionExpiringIn(REFRESH_SKEW_MS - 1);

    expect(isSessionExpired(session, NOW)).toBe(false);
    expect(shouldRefreshSession(session, NOW)).toBe(true);
  });

  it('leaves a comfortably valid token alone', () => {
    expect(
      shouldRefreshSession(sessionExpiringIn(REFRESH_SKEW_MS + 1), NOW),
    ).toBe(false);
  });
});

describe('withRefreshedTokens', () => {
  it('keeps the refresh token that the response omits', () => {
    const session = sessionExpiringIn(0);

    const refreshed = withRefreshedTokens(session, {
      idToken: 'new-id',
      accessToken: 'new-access',
      expiresAt: NOW + 3_600_000,
    });

    expect(refreshed).toEqual({
      idToken: 'new-id',
      accessToken: 'new-access',
      refreshToken: 'refresh',
      expiresAt: NOW + 3_600_000,
    });
  });
});
