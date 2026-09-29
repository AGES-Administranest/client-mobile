import { fetchAdjustableItems } from './stockAdjustmentService';

const ID_TOKEN = 'id-token';

const BACKEND_ITEM = {
  id: 'item-1',
  supplierId: null,
  category: 'MEDICATION',
  unit: 'AMPOULE',
  name: 'Propofol 10mg/ml 20ml',
  defaultUnitCost: '19.90',
  minimumStock: '3',
  currentQuantity: '8.5',
  nearestExpiration: null,
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url,
    query: new URL(url).searchParams,
    headers: init.headers as Record<string, string>,
    body:
      typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined,
  };
}

describe('fetchAdjustableItems', () => {
  it('reads the available quantity the backend sends as a string', async () => {
    respondWith([BACKEND_ITEM]);

    const items = await fetchAdjustableItems(ID_TOKEN);

    expect(items).toEqual([
      {
        id: 'item-1',
        name: 'Propofol 10mg/ml 20ml',
        unit: 'ampoule',
        availableQuantity: 8.5,
        unitCost: 19.9,
      },
    ]);
  });

  it('translates the unit into the vocabulary the screen speaks', async () => {
    respondWith([{ ...BACKEND_ITEM, unit: 'GRAM' }]);

    const [item] = await fetchAdjustableItems(ID_TOKEN);

    expect(item.unit).toBe('gram');
  });

  it('authenticates with the id token and never sends userId', async () => {
    respondWith([]);

    await fetchAdjustableItems(ID_TOKEN);

    const { headers, query } = lastRequest();

    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(query.has('userId')).toBe(false);
  });
});
