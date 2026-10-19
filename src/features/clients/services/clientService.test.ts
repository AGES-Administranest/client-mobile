import { fetchClients } from './clientService';

// Contrato real do ClientController (backend, módulo client):
//   - rota singular: GET /client
//   - só aceita ?type=; o ValidationPipe usa forbidNonWhitelisted, então
//     `search` (ou userId) na query é 400
//   - o dono vem do Authorization: userId na query é 400
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
  };
}

describe('fetchClients', () => {
  test('lista em GET /client filtrando por type=CLINIC: só clínicas cadastradas entram no dropdown', async () => {
    await fetchClients(ID_TOKEN);

    const { url, init } = lastRequest();
    expect(init.method).toBe('GET');
    expect(url.pathname).toBe('/client');
    expect(url.searchParams.get('type')).toBe('CLINIC');
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
