import { sessionStore } from 'shared/services/sessionStore';

import { createItem, deleteItem, fetchItems, updateItem } from './itemService';

// Regras reais do backend (src/modules/item/dto/*.dto.ts no repo backend),
// aplicadas pelo ValidationPipe global com whitelist + forbidNonWhitelisted:
//   - userId: @IsUUID()  -> string vazia é 400
//   - limit:  @Max(100)  -> 200 é 400
const USER_ID = '3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607';
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
  sessionStore.clear();
});

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, query: new URL(url).searchParams };
}

describe('fetchItems', () => {
  test('does not exceed the limit the backend accepts', async () => {
    sessionStore.set({ userId: USER_ID, idToken: 'token' });

    await fetchItems();

    const { query } = lastRequest();
    expect(Number(query.get('limit'))).toBeLessThanOrEqual(BACKEND_MAX_LIMIT);
  });

  test('sends the session user id, never an empty one', async () => {
    sessionStore.set({ userId: USER_ID, idToken: 'token' });

    await fetchItems();

    expect(lastRequest().query.get('userId')).toBe(USER_ID);
  });

  test('fails without firing a request the backend would reject when there is no session', async () => {
    await expect(fetchItems()).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createItem', () => {
  test('fails without firing a request when there is no session', async () => {
    await expect(
      createItem({
        category: 'MEDICATION',
        unit: 'AMPOULE',
        name: 'Dipirona',
      }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('posts to /item with the session user id', async () => {
    sessionStore.set({ userId: USER_ID, idToken: 'token' });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });

    await createItem({
      category: 'MEDICATION',
      unit: 'AMPOULE',
      name: 'Dipirona',
    });

    const { url, init } = lastRequest();
    expect(url).toContain('/item');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({ userId: USER_ID });
  });
});

describe('updateItem', () => {
  test('patches /item/:id and never sends userId (rejected by UpdateItemDto)', async () => {
    sessionStore.set({ userId: USER_ID, idToken: 'token' });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await updateItem('item-1', { name: 'Novo nome' });

    const { url, init } = lastRequest();
    expect(url).toContain('/item/item-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).not.toHaveProperty('userId');
  });
});

describe('deleteItem', () => {
  test('deletes /item/:id', async () => {
    sessionStore.set({ userId: USER_ID, idToken: 'token' });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await deleteItem('item-1');

    const { url, init } = lastRequest();
    expect(url).toContain('/item/item-1');
    expect(init.method).toBe('DELETE');
  });
});
