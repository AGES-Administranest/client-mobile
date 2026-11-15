import { Linking, Platform } from 'react-native';

import { ApiError } from 'shared/services/apiClient';

import {
  downloadTaxPackage,
  requestTaxPackage,
  taxPackageFailure,
} from './taxPackageService';

const EXPORT = {
  url: 'https://bucket.example/exports/pacote.zip?sig=abc',
  expiresAt: 1_800_000_000_000,
  fileName: 'notas-fiscais_2000-01-01_2026-11-13.zip',
  documentsCount: 3,
  skipped: [],
};

function answer(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  (Platform as { OS: string }).OS = 'ios';
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requestTaxPackage', () => {
  it('asks for every invoice up to today, with the id token', async () => {
    fetchMock.mockReturnValue(answer(200, EXPORT));

    await expect(
      requestTaxPackage('id-token', new Date(2026, 10, 13, 9)),
    ).resolves.toEqual(EXPORT);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/reports\/tax-package$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer id-token',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      from: '2000-01-01',
      to: '2026-11-13',
    });
  });
});

describe('downloadTaxPackage', () => {
  it('hands the download link to the system browser', async () => {
    fetchMock.mockReturnValue(answer(200, EXPORT));

    await downloadTaxPackage('id-token');

    expect(Linking.openURL).toHaveBeenCalledWith(EXPORT.url);
  });

  it('opens nothing when the API refuses', async () => {
    fetchMock.mockReturnValue(
      answer(404, { code: 'TAX_PACKAGE_EMPTY', message: 'nothing' }),
    );

    await expect(downloadTaxPackage('id-token')).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('navigates the current tab on web, where a new tab would be blocked', async () => {
    (Platform as { OS: string }).OS = 'web';
    const assign = jest.fn();
    (globalThis as unknown as { location: unknown }).location = { assign };
    fetchMock.mockReturnValue(answer(200, EXPORT));

    await downloadTaxPackage('id-token');

    expect(assign).toHaveBeenCalledWith(EXPORT.url);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});

describe('taxPackageFailure', () => {
  const api = (status: number, code: string | null) =>
    new ApiError('x', code, status);

  it.each([
    ['no invoice with a file', api(404, 'TAX_PACKAGE_EMPTY'), 'empty'],
    ['too many invoices', api(413, 'TAX_PACKAGE_TOO_LARGE'), 'tooLarge'],
    ['too many requests', api(429, null), 'rateLimited'],
    ['a server error', api(500, 'INTERNAL_SERVER_ERROR'), 'failed'],
    ['an expired session', api(401, null), 'failed'],
    ['a request with no answer', new TypeError('no answer'), 'offline'],
    ['anything else', new Error('boom'), 'failed'],
  ])('maps %s to %s', (_label, error, expected) => {
    expect(taxPackageFailure(error)).toBe(expected);
  });
});
