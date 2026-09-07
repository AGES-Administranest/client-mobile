export type AuthSession = {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export const REFRESH_SKEW_MS = 60_000;

export function isSessionExpired(session: AuthSession, now: number): boolean {
  return now >= session.expiresAt;
}

export function shouldRefreshSession(
  session: AuthSession,
  now: number,
): boolean {
  return now >= session.expiresAt - REFRESH_SKEW_MS;
}

export function withRefreshedTokens(
  session: AuthSession,
  refreshed: Omit<AuthSession, 'refreshToken'>,
): AuthSession {
  return { ...refreshed, refreshToken: session.refreshToken };
}
