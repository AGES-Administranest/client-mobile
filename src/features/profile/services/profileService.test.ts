import { fetchProfile } from './profileService';

const PROFILE = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  crmv: null,
  birthDate: null,
  sex: null,
  city: null,
  state: null,
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => PROFILE,
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

it('reads GET /users/me as the token owner, with no id in the path', async () => {
  await expect(fetchProfile('id-token')).resolves.toEqual(PROFILE);

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(new URL(url).pathname).toBe('/users/me');
  expect(init.method).toBe('GET');
  expect((init.headers as Record<string, string>).Authorization).toBe(
    'Bearer id-token',
  );
});

it('keeps the code of an API error', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ code: 'USER_NOT_PROVISIONED' }),
  });

  await expect(fetchProfile('id-token')).rejects.toMatchObject({
    code: 'USER_NOT_PROVISIONED',
    status: 401,
  });
});
