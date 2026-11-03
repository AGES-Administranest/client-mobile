import { fetchServiceInvoices } from './serviceInvoiceService';

const ID_TOKEN = 'id-token';
const fetchMock = jest.fn();

function respondWith(body: unknown) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    pathname: new URL(url).pathname,
    query: new URL(url).searchParams,
    headers: init.headers as Record<string, string>,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('fetchServiceInvoices', () => {
  test('asks only for the confirmed notes, with the limit and the token', async () => {
    respondWith([]);

    await fetchServiceInvoices(ID_TOKEN, 5);

    const { pathname, query, headers } = lastRequest();
    expect(pathname).toBe('/service-invoices');
    expect(query.get('status')).toBe('CONFIRMED');
    expect(query.get('limit')).toBe('5');
    expect(headers.Authorization).toBe(`Bearer ${ID_TOKEN}`);
  });

  test('never sends the userId', async () => {
    respondWith([]);

    await fetchServiceInvoices(ID_TOKEN, 5);

    expect(lastRequest().query.has('userId')).toBe(false);
  });

  test('maps the notes the backend answers', async () => {
    respondWith([
      {
        id: 'invoice-1',
        status: 'CONFIRMED',
        issueDate: '2026-10-13',
        takerName: 'HospVet Sul',
        uploadedAt: '2026-10-13T12:01:00.000Z',
        createdAt: '2026-10-13T12:00:00.000Z',
      },
    ]);

    await expect(fetchServiceInvoices(ID_TOKEN, 5)).resolves.toEqual([
      {
        id: 'invoice-1',
        issueDate: '2026-10-13',
        takerName: 'HospVet Sul',
        hasOriginalFile: true,
      },
    ]);
  });
});
