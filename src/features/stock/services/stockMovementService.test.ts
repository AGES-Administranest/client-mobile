import {
  fetchStockMovements,
  toStockMovement,
  type BackendStockMovement,
} from './stockMovementService';

const ID_TOKEN = 'id-token';
const BACKEND_MAX_LIMIT = 100;

function backendMovement(
  overrides: Partial<BackendStockMovement> = {},
): BackendStockMovement {
  return {
    id: 'movement-1',
    itemId: 'item-1',
    itemName: 'Propofol 10mg/ml 20ml',
    unit: 'AMPOULE',
    type: 'OUTBOUND',
    source: 'APPOINTMENT',
    adjustmentReason: null,
    quantity: '2',
    unitCost: '19.9',
    occurredAt: '2026-09-08T09:30:00.000Z',
    appointmentId: 'appointment-1',
    purchaseOrderId: null,
    lotId: null,
    supplierId: null,
    appointment: {
      id: 'appointment-1',
      label: 'Orquiectomia — Mel',
      procedureName: 'Orquiectomia',
      patientName: 'Mel',
    },
    notes: null,
    ...overrides,
  };
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url,
    query: new URL(url).searchParams,
    headers: init.headers as Record<string, string>,
  };
}

describe('fetchStockMovements', () => {
  it('authenticates with the id token and never sends userId', async () => {
    await fetchStockMovements(ID_TOKEN);

    const { headers, query } = lastRequest();

    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(query.has('userId')).toBe(false);
  });

  it('does not exceed the limit the backend accepts', async () => {
    await fetchStockMovements(ID_TOKEN);

    expect(Number(lastRequest().query.get('limit'))).toBeLessThanOrEqual(
      BACKEND_MAX_LIMIT,
    );
  });

  it('omits the filters that are not set', async () => {
    await fetchStockMovements(ID_TOKEN);

    const { query } = lastRequest();

    expect(query.has('search')).toBe(false);
    expect(query.has('periodStart')).toBe(false);
    expect(query.has('periodEnd')).toBe(false);
  });

  it('sends the filters it was given', async () => {
    await fetchStockMovements(ID_TOKEN, {
      search: 'gaze',
      periodStart: '2026-09-08',
      periodEnd: '2026-09-10',
      page: 2,
    });

    const { query } = lastRequest();

    expect(query.get('search')).toBe('gaze');
    expect(query.get('periodStart')).toBe('2026-09-08');
    expect(query.get('periodEnd')).toBe('2026-09-10');
    expect(query.get('page')).toBe('2');
  });

  it('maps every movement the route returns', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        backendMovement(),
        backendMovement({ id: 'movement-2', source: 'MANUAL_PURCHASE' }),
      ],
    });

    const movements = await fetchStockMovements(ID_TOKEN);

    expect(movements).toHaveLength(2);
    expect(movements[1].source).toBe('manualPurchase');
  });
});

describe('toStockMovement', () => {
  it.each([
    ['UNIT', 'unit'],
    ['AMPOULE', 'ampoule'],
    ['VIAL', 'vial'],
    ['BOX', 'box'],
    ['ML', 'ml'],
    ['MG', 'mg'],
    ['GRAM', 'gram'],
    ['TABLET', 'tablet'],
    ['OTHER', 'other'],
  ] as const)('translates the unit %s into %s', (backend, domain) => {
    expect(toStockMovement(backendMovement({ unit: backend })).unit).toBe(
      domain,
    );
  });

  it.each([
    ['MANUAL_PURCHASE', 'manualPurchase'],
    ['ORDER_IMPORT', 'orderImport'],
    ['APPOINTMENT', 'appointment'],
    ['MANUAL_ADJUSTMENT', 'manualAdjustment'],
    ['CORRECTION_REVERSAL', 'correctionReversal'],
  ] as const)('translates the source %s into %s', (backend, domain) => {
    expect(toStockMovement(backendMovement({ source: backend })).source).toBe(
      domain,
    );
  });

  it.each([
    ['INBOUND', 'inbound'],
    ['OUTBOUND', 'outbound'],
  ] as const)('translates the type %s into %s', (backend, domain) => {
    expect(toStockMovement(backendMovement({ type: backend })).type).toBe(
      domain,
    );
  });

  it.each([
    ['LOSS', 'loss'],
    ['EXPIRATION', 'expiration'],
    ['BREAKAGE', 'breakage'],
    ['OTHER', 'other'],
  ] as const)(
    'translates the adjustment reason %s into %s',
    (backend, domain) => {
      const movement = toStockMovement(
        backendMovement({
          source: 'MANUAL_ADJUSTMENT',
          adjustmentReason: backend,
          appointment: null,
        }),
      );

      expect(movement.adjustmentReason).toBe(domain);
    },
  );

  it('leaves the adjustment reason out when the backend sends null', () => {
    expect(toStockMovement(backendMovement()).adjustmentReason).toBeUndefined();
  });

  it.each([
    ['2', 2],
    ['2.000', 2],
    ['1.5', 1.5],
    ['0.25', 0.25],
  ])('reads the quantity %p sent as a string', (sent, expected) => {
    expect(toStockMovement(backendMovement({ quantity: sent })).quantity).toBe(
      expected,
    );
  });

  it.each([
    ['19.9', 19.9],
    ['19.9000', 19.9],
    ['145', 145],
  ])('reads the unit cost %p sent as a string', (sent, expected) => {
    expect(toStockMovement(backendMovement({ unitCost: sent })).unitCost).toBe(
      expected,
    );
  });

  it('keeps the appointment on a movement that came from one', () => {
    expect(toStockMovement(backendMovement()).appointment).toEqual({
      id: 'appointment-1',
      label: 'Orquiectomia — Mel',
    });
  });

  it('drops the appointment on any other origin', () => {
    const movement = toStockMovement(
      backendMovement({ source: 'MANUAL_PURCHASE' }),
    );

    expect(movement.appointment).toBeUndefined();
  });

  it('keeps the timestamp exactly as the backend sent it', () => {
    expect(toStockMovement(backendMovement()).occurredAt).toBe(
      '2026-09-08T09:30:00.000Z',
    );
  });

  it.each([
    ['unit', { unit: 'LITRE' }],
    ['type', { type: 'SIDEWAYS' }],
    ['source', { source: 'TELEPATHY' }],
  ])('refuses an unknown %s instead of guessing one', (_field, overrides) => {
    expect(() =>
      toStockMovement(
        backendMovement(overrides as Partial<BackendStockMovement>),
      ),
    ).toThrow(/Unknown stock movement/);
  });
});
