import { AuthError } from './authErrors';
import { AuthSession } from './session';

// The names the Cognito user pool gives its identity providers. They are sent
// as `identity_provider` and are the same locally and in production — locally
// the backend registers them against a fake IdP (backend ADR-13).
export type SocialProvider = 'Google' | 'SignInWithApple';

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [
  'Google',
  'SignInWithApple',
];

// What the browser step can end in, reduced to what the app acts on.
export type BrowserOutcome =
  | { type: 'success'; params: Record<string, string> }
  | { type: 'error'; params: Record<string, string> }
  | { type: 'cancel' | 'dismiss' | 'opened' | 'locked' };

export type AuthorizationResult =
  | { status: 'authorized'; code: string }
  | { status: 'cancelled' };

// OAuth's own "the user said no" — closing the provider's consent screen comes
// back as this error rather than as a closed browser.
const USER_DENIED = 'access_denied';

export function readAuthorizationResult(
  outcome: BrowserOutcome,
): AuthorizationResult {
  if (outcome.type === 'success') {
    const code = outcome.params.code;
    if (!code) {
      throw new AuthError('UNKNOWN', 'Authorization returned no code');
    }
    return { status: 'authorized', code };
  }

  if (outcome.type === 'error') {
    if (outcome.params.error === USER_DENIED) {
      return { status: 'cancelled' };
    }
    throw new AuthError(
      'UNKNOWN',
      outcome.params.error_description ?? outcome.params.error,
    );
  }

  // Closed or dismissed browser: the user changed their mind, not a failure.
  return { status: 'cancelled' };
}

export type TokenResult = {
  idToken?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

// Cognito issues one-hour tokens; used only if the response omits expires_in.
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

export function sessionFromTokens(
  tokens: TokenResult,
  now: number,
): AuthSession {
  // The backend validates the id token (it is the one carrying the e-mail), and
  // without a refresh token the session could not outlive the first hour.
  if (!tokens.idToken) {
    throw new AuthError('UNKNOWN', 'Token exchange returned no id token');
  }
  if (!tokens.refreshToken) {
    throw new AuthError('UNKNOWN', 'Token exchange returned no refresh token');
  }

  const expiresIn = tokens.expiresIn ?? DEFAULT_EXPIRES_IN_SECONDS;

  return {
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: now + expiresIn * 1000,
  };
}
