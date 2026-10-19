import { acceptTerms, createSession } from './accountApi';
import { AuthError } from '../domain/authErrors';

const mockFetch = jest.fn();

const MIRROR = {
  id: 'user-1',
  cognitoSub: 'sub-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: null,
  termsVersion: null,
  crmv: null,
};

beforeAll(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/';
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(() => mockFetch.mockReset());

function respondWith(status: number, body: unknown) {
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('createSession', () => {
  it('posts the id token as a bearer and keeps only what the app uses', async () => {
    respondWith(200, MIRROR);

    await expect(createSession('id-token')).resolves.toEqual({
      id: 'user-1',
      name: 'Bruna Senha',
      email: 'bruna@example.com',
      termsAcceptedAt: null,
      termsVersion: null,
    });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/auth/session');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer id-token');
  });

  it('turns the e-mail conflict into its own code', async () => {
    respondWith(409, { code: 'USER_EMAIL_ALREADY_REGISTERED' });

    await expect(createSession('id-token')).rejects.toMatchObject({
      code: 'ACCOUNT_USES_OTHER_SIGN_IN',
    });
  });

  it('reports an unreachable API as NETWORK_UNAVAILABLE', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(createSession('id-token')).rejects.toBeInstanceOf(AuthError);
    await expect(createSession('id-token')).rejects.toMatchObject({
      code: 'NETWORK_UNAVAILABLE',
    });
  });

  it('survives an error response that is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    await expect(createSession('id-token')).rejects.toMatchObject({
      code: 'UNKNOWN',
    });
  });
});

describe('acceptTerms', () => {
  it('sends the accepted version as JSON', async () => {
    respondWith(200, {
      ...MIRROR,
      termsAcceptedAt: '2026-09-13T12:00:00.000Z',
      termsVersion: '2026-09-01',
    });

    const account = await acceptTerms('id-token', '2026-09-01');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/auth/terms');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ termsVersion: '2026-09-01' });
    expect(account.termsVersion).toBe('2026-09-01');
  });
});
