import { ApiError } from 'shared/services/apiClient';

import {
  createFinancialEntry,
  fetchFinancialCategories,
} from './financialEntryService';
import type { CreateFinancialEntryPayload } from '../domain/financialEntry';

// Contrato do backend (módulo financial, PR #50):
//   - GET /financial-categories devolve {id, name, nature, defaultScope}
//   - POST /financial-entries recusa campos fora do DTO (400) e devolve o
//     lançamento com o amount como Decimal serializado ("180")
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

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
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

  const { url, init, headers } = lastRequest();
  expect(init.method).toBe('GET');
  expect(url.pathname).toBe('/financial-categories');
  expect(url.search).toBe('');
  expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
});

test('creates the entry with exactly the DTO fields and reads the amount back as a number', async () => {
  respond(201, {
    ...PAYLOAD,
    amount: '180',
    category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
  });

  const entry = await createFinancialEntry(ID_TOKEN, PAYLOAD);

  const { url, init } = lastRequest();
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
});
