import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  deleteReport,
  fetchReportDownloadLink,
  fetchReportHistory,
} from './reportHistoryService';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn(), delete: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const remove = apiClient.delete as jest.Mock;

function items(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `report-${index}`,
    kind: 'GENERAL_REPORT',
    fileName: `report-${index}.pdf`,
    fileBytesSize: 100,
    period: { from: '2026-10-01', to: '2026-10-31' },
    generatedAt: '2026-11-12T20:47:38.261Z',
  }));
}

beforeEach(() => jest.resetAllMocks());

describe('fetchReportHistory', () => {
  it('asks for the page and the limit with the token, never a userId', async () => {
    get.mockResolvedValue([]);

    await fetchReportHistory('token', 3, 10);

    expect(get).toHaveBeenCalledWith('/reports?page=3&limit=10', {
      token: 'token',
    });
  });

  it('says there is more when the page came full', async () => {
    get.mockResolvedValue(items(2));

    await expect(fetchReportHistory('token', 1, 2)).resolves.toMatchObject({
      hasMore: true,
    });
  });

  it('says it is the last page when it came shorter than the limit', async () => {
    get.mockResolvedValue(items(1));

    await expect(fetchReportHistory('token', 1, 2)).resolves.toMatchObject({
      hasMore: false,
    });
  });
});

describe('fetchReportDownloadLink', () => {
  it('asks the file route of that report', async () => {
    get.mockResolvedValue({ url: 'https://s3/file', expiresAt: 1 });

    await expect(fetchReportDownloadLink('token', 'abc')).resolves.toEqual({
      url: 'https://s3/file',
      expiresAt: 1,
    });
    expect(get).toHaveBeenCalledWith('/reports/abc/file', { token: 'token' });
  });
});

describe('deleteReport', () => {
  it('sends the DELETE with the token', async () => {
    remove.mockResolvedValue(undefined);

    await deleteReport('token', 'abc');

    expect(remove).toHaveBeenCalledWith('/reports/abc', { token: 'token' });
  });

  it('counts a report already gone as deleted', async () => {
    remove.mockRejectedValue(new ApiError('gone', 'REPORT_NOT_FOUND', 404));

    await expect(deleteReport('token', 'abc')).resolves.toBeUndefined();
  });

  it('lets any other failure through', async () => {
    remove.mockRejectedValue(new ApiError('boom', null, 500));

    await expect(deleteReport('token', 'abc')).rejects.toThrow('boom');
  });
});
