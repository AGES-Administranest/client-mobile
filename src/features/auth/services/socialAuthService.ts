import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  TokenError,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { getCognitoOAuthConfig } from './cognitoConfig';
import { AuthError } from '../domain/authErrors';
import { AuthSession } from '../domain/session';
import {
  readAuthorizationResult,
  sessionFromTokens,
  SocialProvider,
} from '../domain/socialSignIn';

// Must match app.json's `scheme` and the callback URLs the backend bootstrap
// registers on the Cognito app client (backend ADR-13).
const APP_SCHEME = 'administranest';
const CALLBACK_PATH = 'auth/callback';
const SCOPES = ['openid', 'email', 'profile'];

// On web the provider sends the popup back to the app itself; this closes it
// and hands the result to the tab that opened it. A no-op on native.
WebBrowser.maybeCompleteAuthSession();

export function socialRedirectUri(): string {
  // Expo Go: exp://<host>:8081/--/auth/callback · web: <origin>/auth/callback ·
  // native build: administranest://auth/callback
  return makeRedirectUri({ scheme: APP_SCHEME, path: CALLBACK_PATH });
}

// Resolves to null when the user backs out, which is not an error to report.
export async function signInWithProvider(
  provider: SocialProvider,
  now: () => number = Date.now,
): Promise<AuthSession | null> {
  const { oauthUrl, clientId } = getCognitoOAuthConfig();
  const redirectUri = socialRedirectUri();

  // Authorization code with PKCE: the app is a public client with no secret,
  // so the verifier is what proves the code is redeemed by whoever asked for it.
  const request = new AuthRequest({
    clientId,
    redirectUri,
    responseType: ResponseType.Code,
    scopes: SCOPES,
    usePKCE: true,
    extraParams: { identity_provider: provider },
  });

  let outcome;
  try {
    outcome = await request.promptAsync(
      { authorizationEndpoint: `${oauthUrl}/oauth2/authorize` },
      // iOS: no cookies shared with Safari, so signing out of the app and
      // tapping Google again asks which account instead of silently reusing it.
      { preferEphemeralSession: true },
    );
  } catch (error) {
    throw new AuthError('UNKNOWN', messageOf(error));
  }

  const authorization = readAuthorizationResult(outcome);
  if (authorization.status === 'cancelled') {
    return null;
  }

  let tokens;
  try {
    tokens = await exchangeCodeAsync(
      {
        clientId,
        code: authorization.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      { tokenEndpoint: `${oauthUrl}/oauth2/token` },
    );
  } catch (error) {
    // A TokenError is Cognito refusing the code; anything else never reached it.
    throw error instanceof TokenError
      ? new AuthError('UNKNOWN', error.description ?? error.message)
      : new AuthError('NETWORK_UNAVAILABLE');
  }

  return sessionFromTokens(tokens, now());
}

function messageOf(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}
