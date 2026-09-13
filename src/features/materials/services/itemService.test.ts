import { ApiError } from 'shared/services/apiClient';

import { createItemLot } from './itemLotService';
import { createItem, deleteItem, fetchItems, updateItem } from './itemService';
import { createSupplier, fetchSuppliers } from './supplierService';

// Regras reais do backend, aplicadas pelo ValidationPipe global com
// whitelist + forbidNonWhitelisted:
//   - o dono vem do Authorization: `userId` no corpo ou na query é 400
//   - limit: @Max(100) -> 200 é 400
const ID_TOKEN = 'id-token';
const BACKEND_MAX_LIMIT = 100;

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
    url,
    init,
    query: new URL(url).searchParams,
    headers: init.headers as Record<string, string>,
    body:
      typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined,
  };
}

function expectAuthenticatedWithoutUserId() {
  const { headers, query, body } = lastRequest();
  expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  expect(query.has('userId')).toBe(false);
  if (body) {
    expect(body).not.toHaveProperty('userId');
  }
}

describe('fetchItems', () => {
  test('does not exceed the limit the backend accepts', async () => {
    await fetchItems(ID_TOKEN);

    const { query } = lastRequest();
    expect(Number(query.get('limit'))).toBeLessThanOrEqual(BACKEND_MAX_LIMIT);
  });

  test('sends the id token as bearer and no userId in the query', async () => {
    await fetchItems(ID_TOKEN);

    expect(lastRequest().url).toContain('/item?');
    expectAuthenticatedWithoutUserId();
  });

  test('a 401 rejects with the API code instead of resolving to a list', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expired', code: 'TOKEN_EXPIRED' }),
    });

    const failure = fetchItems(ID_TOKEN);

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
    });
  });
});

describe('createItem', () => {
  test('posts to /item with the bearer token and no userId in the body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });

    await createItem(ID_TOKEN, {
      category: 'MEDICATION',
      unit: 'AMPOULE',
      name: 'Dipirona',
    });

    const { url, init, body } = lastRequest();
    expect(url).toMatch(/\/item$/);
    expect(init.method).toBe('POST');
    expect(body).toMatchObject({ name: 'Dipirona' });
    expectAuthenticatedWithoutUserId();
  });
});

describe('updateItem', () => {
  test('patches /item/:id with the bearer token and no userId', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await updateItem(ID_TOKEN, 'item-1', { name: 'Novo nome' });

    const { url, init } = lastRequest();
    expect(url).toContain('/item/item-1');
    expect(init.method).toBe('PATCH');
    expectAuthenticatedWithoutUserId();
  });
});

describe('deleteItem', () => {
  test('deletes /item/:id with the bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await deleteItem(ID_TOKEN, 'item-1');

    const { url, init } = lastRequest();
    expect(url).toContain('/item/item-1');
    expect(init.method).toBe('DELETE');
    expectAuthenticatedWithoutUserId();
  });
});

describe('createItemLot', () => {
  test('posts to /item/:id/lot with the bearer token and no userId', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });

    await createItemLot(ID_TOKEN, 'item-1', {
      quantity: 5,
      unitCost: 12.5,
      receivedOn: '2026-09-13',
    });

    const { url, init, body } = lastRequest();
    expect(url).toContain('/item/item-1/lot');
    expect(init.method).toBe('POST');
    expect(body).toMatchObject({ quantity: 5 });
    expectAuthenticatedWithoutUserId();
  });
});

describe('suppliers', () => {
  test('fetchSuppliers sends the bearer token and no userId in the query', async () => {
    await fetchSuppliers(ID_TOKEN);

    expect(lastRequest().url).toContain('/supplier?');
    expectAuthenticatedWithoutUserId();
  });

  test('createSupplier sends the bearer token and no userId in the body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });

    await createSupplier(ID_TOKEN, { name: 'VetSul' });

    const { url, init, body } = lastRequest();
    expect(url).toMatch(/\/supplier$/);
    expect(init.method).toBe('POST');
    expect(body).toEqual({ name: 'VetSul' });
    expectAuthenticatedWithoutUserId();
  });
});
