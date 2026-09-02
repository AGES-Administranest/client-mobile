// The user session and the pure rules around it.
//
// Nothing here knows about Cognito, React or storage: it is data plus three
// functions whose only input is `now`, which makes them testable without a
// fake clock or a network mock.

export type AuthSession = {
  /** Proves who the user is. This is the token our API validates (ADR-02). */
  idToken: string;
  /** Authorizes calls to Cognito itself (change password, read attributes). */
  accessToken: string;
  /** Renews the pair above without asking for the password. Valid 30 days. */
  refreshToken: string;
  /** When `idToken`/`accessToken` expire, as epoch ms. */
  expiresAt: number;
};

/**
 * Margin taken before the real expiry.
 *
 * Refreshing exactly at expiry loses the race: the request leaves with a
 * token that expires in flight. A minute covers latency comfortably, against
 * tokens that last sixty.
 */
export const REFRESH_SKEW_MS = 60_000;

export function isSessionExpired(session: AuthSession, now: number): boolean {
  return now >= session.expiresAt;
}

/** True while still valid, but too close to the end to rely on. */
export function shouldRefreshSession(
  session: AuthSession,
  now: number,
): boolean {
  return now >= session.expiresAt - REFRESH_SKEW_MS;
}

/**
 * Applies the result of a refresh onto the current session.
 *
 * `REFRESH_TOKEN_AUTH` returns a new `AccessToken` and `IdToken` but does
 * NOT return a new `RefreshToken` — real Cognito behaviour, confirmed against
 * the emulator (see `docs/cognito-na-pratica.md` §10 in the backend repo).
 * Overwriting the whole session with the response would drop the refresh
 * token and log the user out on the next renewal, so it is preserved here.
 */
export function withRefreshedTokens(
  session: AuthSession,
  refreshed: Omit<AuthSession, 'refreshToken'>,
): AuthSession {
  return { ...refreshed, refreshToken: session.refreshToken };
}
