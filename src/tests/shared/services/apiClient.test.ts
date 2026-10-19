import { NetworkError } from 'shared/api';
import { ApiError, apiClient } from 'shared/services/apiClient';
import { isNetworkError } from 'shared/utils/network';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

function respondWith(status: number, body: unknown) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

// O DOMException não existe nos tipos do React Native; o que importa aqui é o
// name, que é como a web distingue abort e timeout.
function namedError(name: string): Error {
  return Object.assign(new Error(name), { name });
}

async function captureError(): Promise<ApiError> {
  try {
    await apiClient.patch('/appointments/a-1/complete', {});
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('a chamada deveria ter falhado');
}

describe('ApiError', () => {
  test('preserva o details do corpo de erro', async () => {
    respondWith(409, {
      statusCode: 409,
      code: 'APPOINTMENT_NOT_SCHEDULED',
      message: 'Only a scheduled appointment can be completed',
      details: { status: 'COMPLETED' },
    });

    const error = await captureError();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('APPOINTMENT_NOT_SCHEDULED');
    expect(error.details).toEqual({ status: 'COMPLETED' });
  });

  test('fica com details nulo quando o backend não manda', async () => {
    respondWith(404, {
      statusCode: 404,
      code: 'APPOINTMENT_NOT_FOUND',
      message: 'Appointment not found',
    });

    expect((await captureError()).details).toBeNull();
  });

  test('fica com details nulo quando o corpo não é JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const error = await captureError();

    expect(error.code).toBeNull();
    expect(error.details).toBeNull();
  });

  test('continua aceitando ser criado sem details', () => {
    const error = new ApiError('No active session', 'UNAUTHENTICATED', 401);

    expect(error.details).toBeNull();
  });
});

describe('falha sem resposta', () => {
  it.each([
    [
      'expo/fetch sem conexão no celular',
      new Error('fetch failed: The Internet connection appears to be offline.'),
    ],
    [
      'expo/fetch cancelado',
      new Error('fetch failed: The operation was aborted.'),
    ],
    ['fetch da web', new TypeError('Failed to fetch')],
    ['pedido abortado na web', namedError('AbortError')],
    ['tempo esgotado na web', namedError('TimeoutError')],
  ])('%s vira NetworkError', async (_label, failure) => {
    fetchMock.mockRejectedValue(failure);

    const error = await captureError();

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toHaveProperty('cause', failure);
    expect(error.message).toContain(failure.message);
    expect(isNetworkError(error)).toBe(true);
  });

  test('uma resposta de erro continua sendo ApiError, não falha de rede', async () => {
    respondWith(503, { code: 'UNAVAILABLE', message: 'Service unavailable' });

    const error = await captureError();

    expect(error).toBeInstanceOf(ApiError);
    expect(isNetworkError(error)).toBe(false);
  });
});
