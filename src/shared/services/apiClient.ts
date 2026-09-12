const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
    const payload = await response.json().catch(() => ({}));
    const message =
      (payload as { message?: string }).message ?? `HTTP ${response.status}`;
    throw new Error(message);
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
