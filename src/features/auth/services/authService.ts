import { callCognito } from './cognitoClient';
import { AuthError } from '../domain/authErrors';
import { AuthSession, withRefreshedTokens } from '../domain/session';

// The account operations the app needs, one function per screen action.
//
// All of them return our own types and throw `AuthError` with a translated
// code — no screen should need to know Cognito's response shape.

type AuthenticationResult = {
  AccessToken: string;
  IdToken: string;
  RefreshToken?: string;
  ExpiresIn: number;
};

type InitiateAuthResponse = {
  AuthenticationResult?: AuthenticationResult;
  ChallengeName?: string;
};

type SignUpResponse = {
  UserSub: string;
  UserConfirmed: boolean;
};

export type SignUpResult = {
  userSub: string;
  /** False when Cognito e-mailed a code and is waiting for confirmation. */
  isConfirmed: boolean;
};

/**
 * Creates the account in Cognito.
 *
 * `name` goes in as a standard attribute so the backend's local mirror can be
 * created on first login without a second call (ADR-02).
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<SignUpResult> {
  const response = await callCognito<SignUpResponse>('SignUp', {
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ],
  });

  return { userSub: response.UserSub, isConfirmed: response.UserConfirmed };
}

export async function confirmSignUp(
  email: string,
  code: string,
): Promise<void> {
  await callCognito('ConfirmSignUp', {
    Username: email,
    ConfirmationCode: code,
  });
}

export async function resendConfirmationCode(email: string): Promise<void> {
  await callCognito('ResendConfirmationCode', { Username: email });
}

export async function signIn(
  email: string,
  password: string,
  now: number = Date.now(),
): Promise<AuthSession> {
  const response = await callCognito<InitiateAuthResponse>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });

  const result = response.AuthenticationResult;
  if (!result) {
    // Cognito answered with a challenge instead of tokens (forced password
    // change, MFA). Neither is enabled on our pool today; if one ever is,
    // this is where that flow starts.
    throw new AuthError(
      'UNKNOWN',
      `Unhandled challenge: ${response.ChallengeName ?? 'unknown'}`,
    );
  }

  if (!result.RefreshToken) {
    throw new AuthError('UNKNOWN', 'Sign in returned no refresh token');
  }

  return toSession(result, result.RefreshToken, now);
}

/**
 * Trades the refresh token for a fresh id/access token pair.
 *
 * Returns a new session that keeps the current refresh token — Cognito does
 * not send a new one in this response (see `withRefreshedTokens`).
 */
export async function refreshSession(
  session: AuthSession,
  now: number = Date.now(),
): Promise<AuthSession> {
  const response = await callCognito<InitiateAuthResponse>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: { REFRESH_TOKEN: session.refreshToken },
  });

  const result = response.AuthenticationResult;
  if (!result) {
    // Refresh token expired (30 days) or revoked: the password is the only
    // way back in.
    throw new AuthError('SESSION_EXPIRED');
  }

  return withRefreshedTokens(session, {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    expiresAt: expiresAtFrom(result, now),
  });
}

/**
 * Triggers the password reset e-mail.
 *
 * Does not distinguish an unknown e-mail from a registered one: a
 * `UserNotFound` becomes a silent success, so the screen can always say "if
 * this e-mail has an account, we sent instructions". Without that, the
 * recovery form becomes an oracle for which e-mails exist.
 *
 * The complete defence belongs to the pool (`PreventUserExistenceErrors:
 * ENABLED`); this one guarantees the behaviour even if the pool is ever
 * recreated without the flag.
 */
export async function forgotPassword(email: string): Promise<void> {
  try {
    await callCognito('ForgotPassword', { Username: email });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'INVALID_CREDENTIALS') {
      return;
    }
    throw error;
  }
}

export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await callCognito('ConfirmForgotPassword', {
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
}

/**
 * Invalidates the refresh token server-side.
 *
 * Clearing the session from the device is the caller's job; this stops a
 * copied refresh token from staying valid after logout.
 */
export async function signOut(session: AuthSession): Promise<void> {
  await callCognito('RevokeToken', { Token: session.refreshToken });
}

function toSession(
  result: AuthenticationResult,
  refreshToken: string,
  now: number,
): AuthSession {
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken,
    expiresAt: expiresAtFrom(result, now),
  };
}

function expiresAtFrom(result: AuthenticationResult, now: number): number {
  return now + result.ExpiresIn * 1000;
}
