import { NetworkError } from 'shared/api';

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
    // O `details` do envelope (ADR-07): dados que a tela precisa para reagir
    // ao erro, como o agendamento que conflita num 409. Opcional para que os
    // `new ApiError(...)` existentes continuem valendo.
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * O pedido não teve resposta dentro do `timeoutMs`. É um TypeError porque é
 * assim que o fetch avisa que um pedido ficou sem resposta: o app trata os dois
 * como falha de rede, e a tela pode oferecer tentar de novo.
 */
export class RequestTimeoutError extends TypeError {
  constructor(method: string, path: string, timeoutMs: number) {
    super(`${method} ${path} got no answer within ${timeoutMs} ms`);
    this.name = 'RequestTimeoutError';
  }
}

type RequestOptions = {
  token?: string;
  timeoutMs?: number;
};

type SendOptions = {
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions & { body?: unknown } = {},
): Promise<T> {
  const { timeoutMs, ...sendOptions } = options;
  if (timeoutMs === undefined) {
    return send<T>(method, path, sendOptions);
  }

  // AbortSignal.timeout não existe nos tipos do React Native.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await send<T>(method, path, {
      ...sendOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RequestTimeoutError(method, path, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function send<T>(
  method: string,
  path: string,
  options: SendOptions,
): Promise<T> {
  const { token, body, signal } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchFromApi(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      details?: Record<string, unknown>;
    };
    throw new ApiError(
      payload.message ?? `HTTP ${response.status}`,
      payload.code ?? null,
      response.status,
      payload.details ?? null,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// O fetch só rejeita quando nenhuma resposta chegou: sem rede, servidor fora
// do ar ou pedido cancelado. No celular ele é o expo/fetch, que rejeita com um
// Error comum em vez do TypeError da web, então o tipo da falha é dado aqui.
async function fetchFromApi(
  path: string,
  init: RequestInit & { method: string },
): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}${path}`, init);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new NetworkError(
      `${init.method} ${path} did not reach the API: ${reason}`,
      cause,
    );
  }
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

  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, { ...options, body });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, options);
  },
};
