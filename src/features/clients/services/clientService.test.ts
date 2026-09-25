import { ApiError } from 'shared/services/apiClient';

import { createClient, fetchClients } from './clientService';

// Contrato real do ClientController (backend, módulo client):
//   - rota singular: GET/POST /client
//   - GET só aceita ?type=; o ValidationPipe usa forbidNonWhitelisted, então
//     `search` (ou userId) na query é 400
//   - o dono vem do Authorization: `userId` no corpo ou na query é 400
const ID_TOKEN = 'id-token';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url: new URL(url),
    init,
    headers: init.headers as Record<string, string>,
    body:
      typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined,
  };
}

describe('fetchClients', () => {
  test('lista em GET /client, sem nenhum parâmetro', async () => {
    await fetchClients(ID_TOKEN);

    const { url, init } = lastRequest();
    expect(init.method).toBe('GET');
    expect(url.pathname).toBe('/client');
    expect(url.search).toBe('');
  });

  test('manda o id token como bearer, como as outras chamadas', async () => {
    await fetchClients(ID_TOKEN);

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  });

  test('devolve o array do backend como veio', async () => {
    const payload = [{ id: 'c1', name: 'Clínica VetCenter' }];
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });

    await expect(fetchClients(ID_TOKEN)).resolves.toEqual(payload);
  });

  test('um 401 chega como ApiError, nunca como lista vazia', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 'TOKEN_EXPIRED', message: 'expired' }),
    });

    await expect(fetchClients(ID_TOKEN)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
    });
  });
});

describe('createClient', () => {
  test('cria em POST /client com o payload e o bearer, sem userId', async () => {
    await createClient(ID_TOKEN, { type: 'INDIVIDUAL', name: 'Maria Souza' });

    const { url, init, headers, body } = lastRequest();
    expect(init.method).toBe('POST');
    expect(url.pathname).toBe('/client');
    expect(url.search).toBe('');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(body).toEqual({ type: 'INDIVIDUAL', name: 'Maria Souza' });
    expect(body).not.toHaveProperty('userId');
  });

  test('preserva o code do 409 de nome duplicado', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        code: 'DUPLICATED_CLIENT_NAME',
        message: 'A client with this name already exists',
      }),
    });

    const error = await createClient(ID_TOKEN, {
      type: 'CLINIC',
      name: 'Clínica VetCenter',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'DUPLICATED_CLIENT_NAME',
    });
  });
});
