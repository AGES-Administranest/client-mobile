import { callCognito } from './cognitoClient';
import { AuthError } from '../domain/authErrors';
import { AuthSession, withRefreshedTokens } from '../domain/session';

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
  isConfirmed: boolean;
};

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
    throw new AuthError('SESSION_EXPIRED');
  }

  return withRefreshedTokens(session, {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    expiresAt: expiresAtFrom(result, now),
  });
}

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
