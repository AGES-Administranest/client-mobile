const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Erro de API com o `code` do backend preservado.
 *
 * Pelo ADR-07 o código é o contrato estável — a mensagem pode mudar de texto
 * e de idioma, o código não. Guardá-lo é o que permite a tela dizer o que
 * aconteceu de verdade em vez de cair num "não foi possível salvar".
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  token?: string;
};

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions & { body?: unknown } = {},
): Promise<T> {
  const { token, body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    throw new ApiError(
      payload.message ?? `HTTP ${response.status}`,
      payload.code ?? null,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, options);
  },

  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, { ...options, body });
  },

  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, { ...options, body });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, options);
  },
};
