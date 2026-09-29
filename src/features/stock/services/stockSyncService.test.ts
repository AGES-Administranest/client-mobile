import {
  pullStockMovements,
  pushPendingMovements,
  SYNC_EPOCH,
} from './stockSyncService';
import type { PendingMovement } from '../domain/pendingMovement';

const ID_TOKEN = 'id-token';

const PENDING: PendingMovement = {
  id: '0f8c-uuid',
  itemId: 'item-1',
  itemName: 'Gaze estéril',
  unit: 'box',
  type: 'outbound',
  source: 'manualAdjustment',
  adjustmentReason: 'loss',
  quantity: 2,
  unitCost: 10,
  occurredAt: '2026-09-10T08:00:00.000Z',
  notes: null,
};

const BACKEND_MOVEMENT = {
  id: '0f8c-uuid',
  itemId: 'item-1',
  itemName: 'Gaze estéril',
  unit: 'BOX',
  type: 'OUTBOUND',
  source: 'MANUAL_ADJUSTMENT',
  adjustmentReason: 'LOSS',
  quantity: '2',
  unitCost: '10',
  occurredAt: '2026-09-10T08:00:00.000Z',
  appointmentId: null,
  purchaseOrderId: null,
  lotId: null,
  supplierId: null,
  appointment: null,
  notes: null,
};

const BALANCE = {
  itemId: 'item-1',
  itemName: 'Gaze estéril',
  currentQuantity: '15',
  needsAdjustment: false,
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
        ? (JSON.parse(init.body) as { movements: Record<string, unknown>[] })
        : undefined,
  };
}

describe('pushPendingMovements', () => {
  it('sends the id generated on the device, which is what makes a resend safe', async () => {
    respondWith({
      applied: [],
      duplicated: [],
      balances: [],
      needsAdjustment: [],
    });

    await pushPendingMovements(ID_TOKEN, [PENDING]);

    expect(lastRequest().body?.movements[0].id).toBe('0f8c-uuid');
  });

  it('sends the enums in the canonical form the route documents', async () => {
    respondWith({
      applied: [],
      duplicated: [],
      balances: [],
      needsAdjustment: [],
    });

    await pushPendingMovements(ID_TOKEN, [PENDING]);

    expect(lastRequest().body?.movements[0]).toMatchObject({
      type: 'OUTBOUND',
      source: 'MANUAL_ADJUSTMENT',
      adjustmentReason: 'LOSS',
    });
  });

  it('does not leak the display-only fields into the payload', async () => {
    respondWith({
      applied: [],
      duplicated: [],
      balances: [],
      needsAdjustment: [],
    });

    await pushPendingMovements(ID_TOKEN, [PENDING]);

    const sent = lastRequest().body?.movements[0] ?? {};

    expect(sent).not.toHaveProperty('itemName');
    expect(sent).not.toHaveProperty('unit');
    expect(Object.keys(sent).sort()).toEqual([
      'adjustmentReason',
      'id',
      'itemId',
      'notes',
      'occurredAt',
      'quantity',
      'source',
      'type',
      'unitCost',
    ]);
  });

  it('authenticates with the id token and never sends userId', async () => {
    respondWith({
      applied: [],
      duplicated: [],
      balances: [],
      needsAdjustment: [],
    });

    await pushPendingMovements(ID_TOKEN, [PENDING]);

    const { url, headers, body } = lastRequest();

    expect(url).toContain('/stock-movement/sync');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(body?.movements[0]).not.toHaveProperty('userId');
  });

  it('reads back what the server applied, already in the app vocabulary', async () => {
    respondWith({
      applied: [BACKEND_MOVEMENT],
      duplicated: [],
      balances: [BALANCE],
      needsAdjustment: [],
    });

    const result = await pushPendingMovements(ID_TOKEN, [PENDING]);

    expect(result.applied[0]).toMatchObject({
      id: '0f8c-uuid',
      source: 'manualAdjustment',
      adjustmentReason: 'loss',
      unit: 'box',
      quantity: 2,
      unitCost: 10,
    });
    expect(result.balances[0]).toEqual({
      itemId: 'item-1',
      itemName: 'Gaze estéril',
      currentQuantity: 15,
      needsAdjustment: false,
    });
  });

  it('reports a negative balance as an item to adjust, not as an error', async () => {
    respondWith({
      applied: [BACKEND_MOVEMENT],
      duplicated: [],
      balances: [{ ...BALANCE, currentQuantity: '-2', needsAdjustment: true }],
      needsAdjustment: ['item-1'],
    });

    const result = await pushPendingMovements(ID_TOKEN, [PENDING]);

    expect(result.needsAdjustment).toEqual(['item-1']);
    expect(result.balances[0].currentQuantity).toBe(-2);
  });
});

describe('pullStockMovements', () => {
  it('asks for everything on the first sync', async () => {
    respondWith({ movements: [], balances: [], cursor: 'c1', hasMore: false });

    await pullStockMovements(ID_TOKEN, SYNC_EPOCH);

    expect(lastRequest().query.get('since')).toBe('1970-01-01T00:00:00.000Z');
  });

  it('asks from the cursor it was given', async () => {
    respondWith({ movements: [], balances: [], cursor: 'c2', hasMore: false });

    await pullStockMovements(ID_TOKEN, '2026-09-26T13:45:02.118Z');

    expect(lastRequest().query.get('since')).toBe('2026-09-26T13:45:02.118Z');
  });

  it('returns the new cursor and whether there is more to fetch', async () => {
    respondWith({
      movements: [BACKEND_MOVEMENT],
      balances: [BALANCE],
      cursor: '2026-09-26T13:45:02.118Z',
      hasMore: true,
    });

    const result = await pullStockMovements(ID_TOKEN, SYNC_EPOCH);

    expect(result.cursor).toBe('2026-09-26T13:45:02.118Z');
    expect(result.hasMore).toBe(true);
    expect(result.movements[0].source).toBe('manualAdjustment');
  });
});
