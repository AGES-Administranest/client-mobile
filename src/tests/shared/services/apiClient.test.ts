import { ApiError, apiClient } from 'shared/services/apiClient';

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
