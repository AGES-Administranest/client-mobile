import { ApiError, apiClient } from 'shared/services/apiClient';

import { downloadInBrowser } from './reportFileOpener';
import { saveReportFile } from './reportFileStore';
import {
  createReport,
  deleteReport,
  fetchReportDownloadLink,
  fetchReportHistory,
  GENERATE_TIMEOUT_MS,
  ReportDownloadError,
  saveReport,
} from './reportHistoryService';
import type { GeneratedReport } from '../domain/report.types';

jest.mock('shared/services/apiClient', () => ({
  ...jest.requireActual('shared/services/apiClient'),
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock('./reportFileOpener', () => ({ downloadInBrowser: jest.fn() }));

jest.mock('./reportFileStore', () => ({
  canKeepReportFiles: true,
  saveReportFile: jest.fn(),
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const remove = apiClient.delete as jest.Mock;
const saveFileMock = saveReportFile as jest.Mock;
const browserMock = downloadInBrowser as jest.Mock;
const store = jest.requireMock('./reportFileStore') as {
  canKeepReportFiles: boolean;
};

const GENERATED: GeneratedReport = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileName: 'administranest_relatorio-geral_2026-10-15_2026-11-14.pdf',
  period: { from: '2026-10-15', to: '2026-11-14' },
  sections: ['FINANCIAL', 'TRIPS'],
  generatedAt: '2026-11-12T00:18:55.335Z',
  downloadUrl: 'https://bucket.example/report-1?signature=abc',
  downloadUrlExpiresAt: 1,
  professionalIdComplete: true,
};

const LISTED = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileName: GENERATED.fileName,
  fileBytesSize: null,
  period: GENERATED.period,
  generatedAt: GENERATED.generatedAt,
};

function items(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...LISTED,
    id: `report-${index}`,
    fileBytesSize: 100,
  }));
}

beforeEach(() => {
  jest.resetAllMocks();
  store.canKeepReportFiles = true;
});

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

describe('createReport', () => {
  it('asks the backend for the PDF with the sections it knows', async () => {
    post.mockResolvedValue(GENERATED);

    await expect(
      createReport('id-token', {
        categories: ['travel', 'financial'],
        from: '2026-10-15',
        to: '2026-11-14',
      }),
    ).resolves.toBe(GENERATED);

    expect(post).toHaveBeenCalledWith(
      '/reports',
      {
        from: '2026-10-15',
        to: '2026-11-14',
        sections: ['FINANCIAL', 'TRIPS'],
      },
      { token: 'id-token', timeoutMs: GENERATE_TIMEOUT_MS },
    );
  });
});

describe('saveReport', () => {
  it('keeps the PDF on the device, under its owner, and lists the report', async () => {
    const item = await saveReport('user-1', GENERATED);

    expect(saveFileMock).toHaveBeenCalledWith(
      'user-1',
      GENERATED,
      GENERATED.downloadUrl,
    );
    expect(item).toEqual(LISTED);
  });

  it('tells a failed download apart from a failed generation', async () => {
    saveFileMock.mockRejectedValueOnce(new Error('connection lost'));

    await expect(saveReport('user-1', GENERATED)).rejects.toBeInstanceOf(
      ReportDownloadError,
    );
  });

  it('downloads through the browser where the app keeps no file', async () => {
    store.canKeepReportFiles = false;

    const item = await saveReport('user-1', GENERATED);

    expect(browserMock).toHaveBeenCalledWith(GENERATED.downloadUrl);
    expect(saveFileMock).not.toHaveBeenCalled();
    expect(item).toEqual(LISTED);
  });
});
