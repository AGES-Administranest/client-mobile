/**
 * The single door to our backend.
 *
 * Two error types on purpose: `ApiError` means the API answered and said no —
 * its `code` is the stable contract the screens branch on (ADR-07 on the
 * backend) — while `NetworkError` means the request never got an answer at all.
 * Telling them apart is what lets the UI say "sem conexão" instead of
 * "algo deu errado".
 */

const DEFAULT_BASE_URL = 'http://localhost:3000';

/** The error envelope every failing route returns. */
type ErrorEnvelope = { code?: string; message?: string };

type TokenProvider = () => string | null;

/**
 * There is no sign-in screen yet, so nothing holds a session and requests go
 * out unauthenticated — which only works against a backend running with
 * `DEV_AUTH_BYPASS=true`. When the login lands, it calls `setAuthTokenProvider`
 * once and every request below starts carrying the IdToken.
 */
let readToken: TokenProvider = () => null;

export function setAuthTokenProvider(provider: TokenProvider): void {
  readToken = provider;
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    '',
  );
}

/** POSTs JSON and returns the parsed body. `T` is what the route documents. */
export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const token = readToken();

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    throw new NetworkError(`POST ${path} did not reach the API`, cause);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  // A failure without our envelope (a proxy, a crash before the filter) still
  // has to come out as an ApiError — the caller only knows how to read one.
  const envelope = (await response
    .json()
    .catch(() => null)) as ErrorEnvelope | null;

  return new ApiError(
    response.status,
    envelope?.code ?? 'ERRO_HTTP',
    envelope?.message ?? `HTTP ${response.status}`,
  );
}
