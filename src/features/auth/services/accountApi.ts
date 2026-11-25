import { ApiError, NetworkError, postJson } from 'shared/api';
import {
  ApiError as ApiClientError,
  apiClient,
} from 'shared/services/apiClient';

import { Account } from '../domain/account';
import { AuthError, fromApiError } from '../domain/authErrors';

// postJson and apiClient each throw an ApiError of their own.
function toAuthError(error: unknown): unknown {
  if (error instanceof ApiError || error instanceof ApiClientError) {
    const code = error.code ?? undefined;
    return new AuthError(fromApiError(error.status, code), code);
  }
  if (error instanceof NetworkError) {
    return new AuthError('NETWORK_UNAVAILABLE');
  }
  return error;
}

// The backend validates the id token: it is the one that carries the e-mail
// (backend ADR-02 and the US34.2 guard).
async function post(
  path: string,
  idToken: string,
  body?: Record<string, unknown>,
): Promise<Account> {
  try {
    return toAccount(await postJson<unknown>(path, idToken, body));
  } catch (error) {
    throw toAuthError(error);
  }
}

// Creates the user's record on the first sign in and refreshes it on every
// later one. Idempotent on the backend side.
export function createSession(idToken: string): Promise<Account> {
  return post('/auth/session', idToken);
}

export function acceptTerms(
  idToken: string,
  termsVersion: string,
): Promise<Account> {
  return post('/auth/terms', idToken, { termsVersion });
}

function toAccount(payload: unknown): Account {
  const data = payload as Record<string, unknown>;

  return {
    id: String(data.id),
    name: String(data.name),
    email: String(data.email),
    termsAcceptedAt:
      typeof data.termsAcceptedAt === 'string' ? data.termsAcceptedAt : null,
    termsVersion:
      typeof data.termsVersion === 'string' ? data.termsVersion : null,
  };
}

export async function deleteAccount(idToken: string): Promise<void> {
  try {
    await apiClient.delete<void>('/users/me', { token: idToken });
  } catch (error) {
    throw toAuthError(error);
  }
}
