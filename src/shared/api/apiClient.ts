/**
 * The single door to our backend.
 *
 * Two error types on purpose: `ApiError` means the API answered and said no —
 * its `code` is the stable contract the screens branch on (ADR-07 on the
 * backend) — while `NetworkError` means the request never got an answer at all.
 * Telling them apart is what lets the UI say "sem conexão" instead of
 * "algo deu errado".
 */

/** The error envelope every failing route returns. */
type ErrorEnvelope = { code?: string; message?: string };

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
  const url = process.env.EXPO_PUBLIC_API_URL;

  if (!url) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Point it at the Administranest backend ' +
        '(http://localhost:3000 locally — see .env.example).',
    );
  }

  return url.replace(/\/+$/, '');
}

/** POSTs JSON and returns the parsed body. `T` is what the route documents. */
export async function postJson<T>(
  path: string,
  idToken: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
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
