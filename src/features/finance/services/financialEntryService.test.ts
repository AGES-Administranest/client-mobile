import { ApiError } from 'shared/services/apiClient';

import {
  createFinancialCategory,
  createFinancialEntry,
  fetchFinancialCategories,
} from './financialEntryService';
import type {
  CreateFinancialCategoryPayload,
  CreateFinancialEntryPayload,
} from '../domain/financialEntry';

// Contrato do backend (módulo financial, PR #50):
//   - GET /financial-categories devolve {id, name, nature, defaultScope,
//     isDefault}; POST /financial-categories recebe {id, name, nature,
//     defaultScope}, pega o dono do token e responde 409 com details.id
//     quando o nome já existe naquela natureza
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

const NEW_CATEGORY: CreateFinancialCategoryPayload = {
  id: '3b8f5d2e-1c4a-4e7b-9a60-2f1d8c7e5b43',
  name: 'Comida',
  nature: 'EXPENSE',
  defaultScope: 'PERSONAL',
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
      isDefault: true,
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

test('creates a category with exactly the DTO fields and the id token, never a user id', async () => {
  respond(201, { ...NEW_CATEGORY, isDefault: false });

  await expect(
    createFinancialCategory(ID_TOKEN, NEW_CATEGORY),
  ).resolves.toEqual({ ...NEW_CATEGORY, isDefault: false });

  const { url, init, headers } = lastRequest();
  expect(init.method).toBe('POST');
  expect(url.pathname).toBe('/financial-categories');
  expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  expect(JSON.parse(init.body as string)).toEqual(NEW_CATEGORY);
});

test('keeps the id of the category that already has the name', async () => {
  respond(409, {
    code: 'FINANCIAL_CATEGORY_DUPLICATED',
    message: 'A category with this name already exists',
    details: { id: 'cat-food' },
  });

  const error = await createFinancialCategory(ID_TOKEN, NEW_CATEGORY).catch(
    e => e,
  );

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({
    status: 409,
    code: 'FINANCIAL_CATEGORY_DUPLICATED',
    details: { id: 'cat-food' },
  });
});
