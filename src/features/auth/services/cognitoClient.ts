import { getCognitoConfig } from './cognitoConfig';
import {
  AuthError,
  AuthErrorCode,
  toAuthErrorCode,
} from '../domain/authErrors';

// Raw transport for the Cognito API.
//
// Cognito's API is not REST: it is a single POST to the root, with the
// operation carried in the `X-Amz-Target` header. Every operation used here
// (sign in, sign up, password recovery) is unauthenticated, so none of them
// need SigV4 signing — which is why `fetch` is enough and no SDK is required.

const AMZ_JSON_CONTENT_TYPE = 'application/x-amz-json-1.1';
const TARGET_PREFIX = 'AWSCognitoIdentityProviderService';

export type CognitoOperation =
  | 'SignUp'
  | 'ConfirmSignUp'
  | 'ResendConfirmationCode'
  | 'InitiateAuth'
  | 'ForgotPassword'
  | 'ConfirmForgotPassword'
  | 'RevokeToken';

export async function callCognito<TResponse>(
  operation: CognitoOperation,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const { endpoint, clientId } = getCognitoConfig();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': AMZ_JSON_CONTENT_TYPE,
        'X-Amz-Target': `${TARGET_PREFIX}.${operation}`,
      },
      body: JSON.stringify({ ClientId: clientId, ...body }),
    });
  } catch {
    // `fetch` only rejects when the request never happened: no network, DNS
    // failure, emulator down. A server-side error arrives as a response.
    throw new AuthError('NETWORK_UNAVAILABLE');
  }

  const payload: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthError(readErrorCode(payload), readErrorMessage(payload));
  }

  return payload as TResponse;
}

function readErrorCode(payload: unknown): AuthErrorCode {
  const type = readString(payload, '__type');
  return type ? toAuthErrorCode(type) : 'UNKNOWN';
}

// Cognito's original message, kept for logs and debugging only. The screen
// shows the dictionary string matching `code`, never this one.
function readErrorMessage(payload: unknown): string | undefined {
  return readString(payload, 'message') ?? readString(payload, 'Message');
}

function readString(payload: unknown, key: string): string | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
