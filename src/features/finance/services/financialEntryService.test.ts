import { ApiError, RequestTimeoutError } from 'shared/services/apiClient';

import {
  createFinancialEntry,
  fetchFinancialCategories,
  fetchFinancialEntries,
} from './financialEntryService';
import type { CreateFinancialEntryPayload } from '../domain/financialEntry';

// Contrato do backend (módulo financial, PR #50):
//   - GET /financial-categories devolve {id, name, nature, defaultScope}
//   - GET /financial-entries?month&year&scope&page&limit devolve a página do
//     mês (uma página menor que o limit é a última) com o amount como texto
//   - POST /financial-entries recusa campos fora do DTO (400) e devolve o
//     lançamento com o amount como Decimal serializado ("180")
//   - POST com um id já usado e outros dados responde 409
//     FINANCIAL_ENTRY_ID_CONFLICT; PATCH /financial-entries/:id de um id que
//     não é um lançamento ativo da conta responde 404 FINANCIAL_ENTRY_NOT_FOUND
const ID_TOKEN = 'id-token';

const PAYLOAD: CreateFinancialEntryPayload = {
  id: 'entry-1',
  nature: 'EXPENSE',
  description: 'Combustível',
  amount: 180,
  accrualDate: '2026-08-09T12:00:00.000Z',
  categoryId: 'cat-travel',
  scope: 'PROFESSIONAL',
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function answer(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue(answer(status, body));
}

function respondInOrder(...answers: [status: number, body: unknown][]) {
  answers.forEach(([status, body]) =>
    fetchMock.mockResolvedValueOnce(answer(status, body)),
  );
}

function sentRequest(index = 0) {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return {
    url: new URL(url),
    init,
    headers: init.headers as Record<string, string>,
  };
}

test('lists the categories of both types with the id token', async () => {
  const categories = [
    {
      id: 'cat-travel',
      name: 'Travel',
      nature: 'EXPENSE',
      defaultScope: 'PROFESSIONAL',
    },
  ];
  respond(200, categories);

  await expect(fetchFinancialCategories(ID_TOKEN)).resolves.toEqual(categories);

  const { url, init, headers } = sentRequest();
  expect(init.method).toBe('GET');
  expect(url.pathname).toBe('/financial-categories');
  expect(url.search).toBe('');
  expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
});

const SAVED_ENTRY = {
  ...PAYLOAD,
  amount: '180',
  category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
  source: 'MANUAL',
  origin: { type: 'MANUAL', id: null },
};

const ID_CONFLICT = {
  code: 'FINANCIAL_ENTRY_ID_CONFLICT',
  message: 'This id is already in use',
};

test('creates the entry with exactly the DTO fields and reads the amount back as a number', async () => {
  respond(201, SAVED_ENTRY);

  const entry = await createFinancialEntry(ID_TOKEN, PAYLOAD);

  const { url, init } = sentRequest();
  expect(init.method).toBe('POST');
  expect(url.pathname).toBe('/financial-entries');
  expect(JSON.parse(init.body as string)).toEqual(PAYLOAD);
  expect(entry.amount).toBe(180);
  expect(entry.source).toBe('MANUAL');
});

test('keeps the backend error code so the form can explain it', async () => {
  respond(400, {
    code: 'FINANCIAL_CATEGORY_INVALID',
    message: 'The category is missing or has another nature',
  });

  const error = await createFinancialEntry(ID_TOKEN, PAYLOAD).catch(e => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({
    status: 400,
    code: 'FINANCIAL_CATEGORY_INVALID',
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('a 409 for the form id saves what is on screen over the earlier attempt that went through', async () => {
  respondInOrder([409, ID_CONFLICT], [200, SAVED_ENTRY]);

  const entry = await createFinancialEntry(ID_TOKEN, PAYLOAD);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  const { url, init, headers } = sentRequest(1);
  const { id, ...draft } = PAYLOAD;
  expect(init.method).toBe('PATCH');
  expect(url.pathname).toBe(`/financial-entries/${id}`);
  expect(JSON.parse(init.body as string)).toEqual(draft);
  expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  expect(init.signal).toBeDefined();
  expect(entry.amount).toBe(180);
});

test('when the 409 id is not an active entry of this account, the PATCH answer reaches the form', async () => {
  respondInOrder(
    [409, ID_CONFLICT],
    [
      404,
      {
        code: 'FINANCIAL_ENTRY_NOT_FOUND',
        message: 'Financial entry was not found',
      },
    ],
  );

  const error = await createFinancialEntry(ID_TOKEN, PAYLOAD).catch(e => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({
    status: 404,
    code: 'FINANCIAL_ENTRY_NOT_FOUND',
  });
});

test('stops waiting for a save after 20 s, as a network failure the form can retry', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new Error('The operation was aborted.')),
          ),
        ),
    );

    const failure = createFinancialEntry(ID_TOKEN, PAYLOAD).catch(e => e);
    jest.advanceTimersByTime(20000);

    expect(await failure).toBeInstanceOf(RequestTimeoutError);
  } finally {
    jest.useRealTimers();
  }
});

describe('fetchFinancialEntries', () => {
  const AUGUST = { period: { month: 8, year: 2026 }, scope: 'all' } as const;

  it('asks for one page of the month with the id token', async () => {
    respond(200, []);

    await fetchFinancialEntries(ID_TOKEN, AUGUST, 2);

    const { url, init, headers } = sentRequest();
    expect(init.method).toBe('GET');
    expect(url.pathname).toBe('/financial-entries');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      month: '8',
      year: '2026',
      page: '2',
      limit: '50',
    });
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  });

  it('sends the chosen scope and leaves it out for "all"', async () => {
    respond(200, []);

    await fetchFinancialEntries(ID_TOKEN, { ...AUGUST, scope: 'PERSONAL' }, 1);
    await fetchFinancialEntries(ID_TOKEN, AUGUST, 1);

    expect(sentRequest(0).url.searchParams.get('scope')).toBe('PERSONAL');
    expect(sentRequest(1).url.searchParams.has('scope')).toBe(false);
  });

  it('turns the amount text into a number and keeps the rest', async () => {
    respond(200, [
      {
        id: 'entry-1',
        nature: 'INCOME',
        description: 'Orquiectomia – Mel',
        category: {
          id: 'cat-fees',
          name: 'Professional fees',
          scope: 'PROFESSIONAL',
        },
        scope: 'PROFESSIONAL',
        amount: '620',
        accrualDate: '2026-08-17T12:00:00.000Z',
        source: 'APPOINTMENT',
        origin: { type: 'APPOINTMENT', id: 'appointment-1' },
      },
    ]);

    const [entry] = await fetchFinancialEntries(ID_TOKEN, AUGUST, 1);

    expect(entry.amount).toBe(620);
    expect(entry.source).toBe('APPOINTMENT');
    expect(entry.origin).toEqual({ type: 'APPOINTMENT', id: 'appointment-1' });
  });

  it('passes the API error through', async () => {
    respond(401, { code: 'TOKEN_EXPIRED', message: 'expired' });

    await expect(fetchFinancialEntries(ID_TOKEN, AUGUST, 1)).rejects.toThrow(
      ApiError,
    );
  });
});
