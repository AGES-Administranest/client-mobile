import { Account, ApiErrorBody } from '../domain/account';
import { AuthError, fromApiError } from '../domain/authErrors';

function apiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;

  if (!url) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Point it at the Administranest backend ' +
        '(http://localhost:3000 locally — see .env.example).',
    );
  }

  return url.replace(/\/+$/, '');
}

// The backend validates the id token: it is the one that carries the e-mail
// (backend ADR-02 and the US34.2 guard).
async function post(
  path: string,
  idToken: string,
  body?: Record<string, unknown>,
): Promise<Account> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AuthError('NETWORK_UNAVAILABLE');
  }

  const payload: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const { code } = (payload ?? {}) as ApiErrorBody;
    throw new AuthError(fromApiError(response.status, code), code);
  }

  return toAccount(payload);
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
