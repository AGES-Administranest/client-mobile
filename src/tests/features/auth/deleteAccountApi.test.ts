import { deleteAccount } from 'features/auth/services/accountApi';

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('deleteAccount', () => {
  it('deletes the account of the token, without naming it', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    await expect(deleteAccount('id-token')).resolves.toBeUndefined();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/users\/me$/);
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer id-token');
    expect(init.body).toBeUndefined();
  });

  it('reports an unreachable API', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(deleteAccount('id-token')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'NETWORK_UNAVAILABLE',
    });
  });

  it.each([
    [401, 'REAUTH_REQUIRED', 'REAUTH_REQUIRED'],
    [500, 'ACCOUNT_DELETION_INCOMPLETE', 'ACCOUNT_DELETION_INCOMPLETE'],
    [401, 'TOKEN_EXPIRED', 'SESSION_EXPIRED'],
    [429, undefined, 'TOO_MANY_ATTEMPTS'],
    [500, 'ACCOUNT_DELETION_FAILED', 'UNKNOWN'],
  ])('turns a %i %s into %s', async (status, code, expected) => {
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ code }),
    });

    await expect(deleteAccount('id-token')).rejects.toMatchObject({
      name: 'AuthError',
      code: expected,
    });
  });
});
