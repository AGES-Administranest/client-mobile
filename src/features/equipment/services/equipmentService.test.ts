import { ApiError } from 'shared/services/apiClient';

import { equipmentService } from './equipmentService';

// O dono do equipamento vem do Authorization: o backend recusa `userId` no
// corpo (forbidNonWhitelisted) e `salvageValue` só entra se a tela o mandar.
const ID_TOKEN = 'id-token';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    path: new URL(url).pathname,
    method: init.method,
    headers: init.headers as Record<string, string>,
    body:
      typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined,
  };
}

const DTO = {
  name: 'Vaporizador Matrx VIP 3000',
  purchaseValue: 8500,
  acquisitionDate: '2022-03-01',
  usefulLifeMonths: 120,
  notes: 'Calibração anual',
};

describe('list and summary', () => {
  test('list is GET /equipment with the id token as bearer', async () => {
    await equipmentService.list(ID_TOKEN);

    const { path, method, headers } = lastRequest();
    expect(method).toBe('GET');
    expect(path).toBe('/equipment');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  });

  test('summary is GET /equipment/summary', async () => {
    await equipmentService.summary(ID_TOKEN);

    const { path, method } = lastRequest();
    expect(method).toBe('GET');
    expect(path).toBe('/equipment/summary');
  });
});

describe('create', () => {
  test('is POST /equipment with the token and the dto as the body', async () => {
    await equipmentService.create(ID_TOKEN, DTO);

    const { path, method, headers, body } = lastRequest();
    expect(method).toBe('POST');
    expect(path).toBe('/equipment');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(body).toEqual(DTO);
  });

  test('never sends userId', async () => {
    await equipmentService.create(ID_TOKEN, DTO);

    expect(lastRequest().body).not.toHaveProperty('userId');
  });

  test('resolves to what the API returned', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'eq-1', ...DTO }),
    });

    await expect(equipmentService.create(ID_TOKEN, DTO)).resolves.toMatchObject(
      { id: 'eq-1', name: DTO.name },
    );
  });
});

describe('update', () => {
  test('is PATCH /equipment/:id with the token and only the given fields', async () => {
    await equipmentService.update(ID_TOKEN, 'eq-1', {
      name: 'Novo nome',
      notes: null,
    });

    const { path, method, headers, body } = lastRequest();
    expect(method).toBe('PATCH');
    expect(path).toBe('/equipment/eq-1');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(body).toEqual({ name: 'Novo nome', notes: null });
  });

  test('never sends userId', async () => {
    await equipmentService.update(ID_TOKEN, 'eq-1', { name: 'Novo nome' });

    expect(lastRequest().body).not.toHaveProperty('userId');
  });
});

describe('deactivate', () => {
  test('is DELETE /equipment/:id with the token and no body', async () => {
    await equipmentService.deactivate(ID_TOKEN, 'eq-1');

    const { path, method, headers, body } = lastRequest();
    expect(method).toBe('DELETE');
    expect(path).toBe('/equipment/eq-1');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
    expect(body).toBeUndefined();
  });

  test('resolves to nothing, whatever the API answers', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'eq-1', active: false }),
    });

    await expect(
      equipmentService.deactivate(ID_TOKEN, 'eq-1'),
    ).resolves.toBeUndefined();
  });

  test('a missing equipment rejects with the API code and status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        message: 'Equipment eq-1 not found',
        code: 'EQUIPMENT_NOT_FOUND',
      }),
    });

    await expect(
      equipmentService.deactivate(ID_TOKEN, 'eq-1'),
    ).rejects.toMatchObject({ status: 404, code: 'EQUIPMENT_NOT_FOUND' });
  });

  test('a 401 rejects and a network failure propagates', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expired', code: 'TOKEN_EXPIRED' }),
    });
    await expect(
      equipmentService.deactivate(ID_TOKEN, 'eq-1'),
    ).rejects.toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' });

    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(equipmentService.deactivate(ID_TOKEN, 'eq-1')).rejects.toThrow(
      'network down',
    );
  });
});

describe('API errors', () => {
  test('a 401 rejects with the API code and status, never a resolved value', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expired', code: 'TOKEN_EXPIRED' }),
    });

    const failure = await equipmentService
      .create(ID_TOKEN, DTO)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' });
  });

  test('a validation error on update keeps the backend code', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Purchase value must be greater than zero',
        code: 'EQUIPMENT_PURCHASE_VALUE_INVALID',
      }),
    });

    await expect(
      equipmentService.update(ID_TOKEN, 'eq-1', { purchaseValue: 0 }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'EQUIPMENT_PURCHASE_VALUE_INVALID',
    });
  });

  test('a network failure propagates', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(equipmentService.list(ID_TOKEN)).rejects.toThrow(
      'network down',
    );
  });
});
