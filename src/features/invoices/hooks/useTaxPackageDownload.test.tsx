import ReactTestRenderer, { act } from 'react-test-renderer';

import { ApiError } from 'shared/services/apiClient';

import { useTaxPackageDownload } from './useTaxPackageDownload';
import { downloadTaxPackage } from '../services/taxPackageService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'id-token' } }),
}));

jest.mock('../services/taxPackageService', () => ({
  ...jest.requireActual('../services/taxPackageService'),
  downloadTaxPackage: jest.fn(),
}));

const downloadMock = downloadTaxPackage as jest.MockedFunction<
  typeof downloadTaxPackage
>;

function renderDownload() {
  const result = {
    current: null as unknown as ReturnType<typeof useTaxPackageDownload>,
  };

  function TestHarness() {
    result.current = useTaxPackageDownload();
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return result;
}

async function press(result: ReturnType<typeof renderDownload>) {
  await act(async () => {
    result.current.download();
    await Promise.resolve();
  });
}

beforeEach(() => downloadMock.mockReset());

describe('useTaxPackageDownload', () => {
  it('starts idle', () => {
    expect(renderDownload().current.status).toBe('idle');
  });

  it('downloads with the id token and ends done', async () => {
    downloadMock.mockResolvedValue(undefined);
    const result = renderDownload();

    await press(result);

    expect(downloadMock).toHaveBeenCalledWith('id-token');
    expect(result.current.status).toBe('done');
  });

  it('says it is downloading while the zip is built', async () => {
    downloadMock.mockReturnValue(new Promise(() => undefined));
    const result = renderDownload();

    await press(result);

    expect(result.current.status).toBe('downloading');
  });

  it('ignores a second press while one is running', async () => {
    downloadMock.mockReturnValue(new Promise(() => undefined));
    const result = renderDownload();

    await press(result);
    await press(result);

    expect(downloadMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiError('x', 'TAX_PACKAGE_EMPTY', 404), 'empty'],
    [new ApiError('x', 'TAX_PACKAGE_TOO_LARGE', 413), 'tooLarge'],
    [new ApiError('x', null, 429), 'rateLimited'],
    [new TypeError('no answer'), 'offline'],
    [new Error('boom'), 'failed'],
  ])('ends %# as %s', async (error, expected) => {
    downloadMock.mockRejectedValue(error);
    const result = renderDownload();

    await press(result);

    expect(result.current.status).toBe(expected);
  });

  it('lets the user try again after a failure', async () => {
    downloadMock.mockRejectedValueOnce(new Error('boom'));
    downloadMock.mockResolvedValueOnce(undefined);
    const result = renderDownload();

    await press(result);
    await press(result);

    expect(result.current.status).toBe('done');
  });
});
