import {
  ApiError,
  RequestTimeoutError,
  apiClient,
} from 'shared/services/apiClient';
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

describe('timeoutMs', () => {
  async function failureOf(request: Promise<unknown>): Promise<Error> {
    try {
      await request;
    } catch (error) {
      return error as Error;
    }
    throw new Error('o pedido deveria ter falhado');
  }

  function answerOnlyWhenAborted() {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('The operation was aborted.')),
          );
        }),
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('sem timeoutMs o pedido espera a resposta o tempo que for', async () => {
    respondWith(200, { id: 'a-1' });

    await apiClient.get('/appointments/a-1');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('desiste quando o tempo acaba, e isso conta como falha de rede', async () => {
    answerOnlyWhenAborted();

    const failure = failureOf(
      apiClient.post('/financial-entries', {}, { timeoutMs: 20000 }),
    );
    jest.advanceTimersByTime(19999);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    const error = await failure;

    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect(error.message).toBe(
      'POST /financial-entries got no answer within 20000 ms',
    );
    expect(isNetworkError(error)).toBe(true);
  });

  test('uma resposta dentro do prazo chega como sempre, inclusive um erro da API', async () => {
    respondWith(409, {
      code: 'FINANCIAL_ENTRY_ID_CONFLICT',
      message: 'This id is already in use',
    });

    const error = await failureOf(
      apiClient.post('/financial-entries', {}, { timeoutMs: 20000 }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('FINANCIAL_ENTRY_ID_CONFLICT');
    expect(isNetworkError(error)).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
