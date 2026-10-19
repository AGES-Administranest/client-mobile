import { ApiError, NetworkError, postJson } from 'shared/api';

import { Account } from '../domain/account';
import { AuthError, fromApiError } from '../domain/authErrors';

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
    if (error instanceof ApiError) {
      throw new AuthError(fromApiError(error.status, error.code), error.code);
    }
    if (error instanceof NetworkError) {
      throw new AuthError('NETWORK_UNAVAILABLE');
    }
    throw error;
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
