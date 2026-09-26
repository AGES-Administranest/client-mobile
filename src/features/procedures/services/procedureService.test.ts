import { ApiError } from 'shared/services/apiClient';

import {
  createAppointment,
  fetchAppointments,
  updateAppointment,
} from './procedureService';

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
    body:
      typeof init.body === 'string'
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined,
  };
}

describe('fetchAppointments', () => {
  test('lista em GET /appointments com o token no Authorization', async () => {
    await fetchAppointments(ID_TOKEN, { page: 1, pageSize: 20 });

    const { url, init, headers } = lastRequest();
    expect(init.method).toBe('GET');
    expect(url.pathname).toBe('/appointments');
    expect(headers.Authorization).toBe('Bearer id-token');
  });

  test('manda status, página e tamanho da página', async () => {
    await fetchAppointments(ID_TOKEN, {
      status: 'COMPLETED',
      page: 3,
      pageSize: 20,
    });

    expect(Object.fromEntries(lastRequest().url.searchParams)).toEqual({
      status: 'COMPLETED',
      page: '3',
      pageSize: '20',
    });
  });

  test('omite from e to quando não há período, em vez de mandá-los vazios', async () => {
    await fetchAppointments(ID_TOKEN, { page: 1, pageSize: 20 });

    const { searchParams } = lastRequest().url;
    expect(searchParams.has('from')).toBe(false);
    expect(searchParams.has('to')).toBe(false);
    expect(searchParams.has('status')).toBe(false);
  });

  test('preserva o ISO completo de from e to, com escape na URL', async () => {
    const from = new Date(2026, 7, 6, 0, 0, 0, 0).toISOString();
    const to = new Date(2026, 7, 8, 23, 59, 59, 999).toISOString();

    await fetchAppointments(ID_TOKEN, { page: 1, pageSize: 20, from, to });

    const { searchParams } = lastRequest().url;
    expect(searchParams.get('from')).toBe(from);
    expect(searchParams.get('to')).toBe(to);
  });

  test('nunca manda userId: o dono vem do token', async () => {
    await fetchAppointments(ID_TOKEN, { page: 1, pageSize: 20 });

    expect(lastRequest().url.searchParams.has('userId')).toBe(false);
  });

  test('devolve o array como o backend mandou', async () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => list,
    });

    await expect(
      fetchAppointments(ID_TOKEN, { page: 1, pageSize: 20 }),
    ).resolves.toEqual(list);
  });

  test('propaga o ApiError com o code do backend', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'no', code: 'TOKEN_EXPIRED' }),
    });

    await expect(
      fetchAppointments(ID_TOKEN, { page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({
      constructor: ApiError,
      code: 'TOKEN_EXPIRED',
      status: 401,
    });
  });
});

describe('updateAppointment', () => {
  test('edita em PATCH /appointments/:id com o payload parcial', async () => {
    await updateAppointment(ID_TOKEN, 'appointment-9', {
      amount: 400,
      notes: 'Retorno',
    });

    const { url, init, body, headers } = lastRequest();
    expect(init.method).toBe('PATCH');
    expect(url.pathname).toBe('/appointments/appointment-9');
    expect(headers.Authorization).toBe('Bearer id-token');
    expect(body).toEqual({ amount: 400, notes: 'Retorno' });
  });
});

describe('createAppointment', () => {
  test('cria em POST /appointments', async () => {
    await createAppointment(ID_TOKEN, {
      startsAt: '2026-08-06T12:00:00.000Z',
      status: 'COMPLETED',
    });

    const { url, init, body } = lastRequest();
    expect(init.method).toBe('POST');
    expect(url.pathname).toBe('/appointments');
    expect(body).toEqual({
      startsAt: '2026-08-06T12:00:00.000Z',
      status: 'COMPLETED',
    });
  });
});
