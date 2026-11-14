import ReactTestRenderer, { act } from 'react-test-renderer';

import { isOnline } from 'shared/services/network';

import { useReportFile } from './useReportFile';
import type { ReportHistoryItem } from '../domain/report.types';
import { openLocalReport } from '../services/reportFileOpener';
import { findLocalReport, saveReportFile } from '../services/reportFileStore';
import { fetchReportDownloadLink } from '../services/reportHistoryService';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'id-token' },
    account: { id: 'user-1' },
  }),
}));

jest.mock('shared/services/network', () => ({ isOnline: jest.fn() }));

jest.mock('../services/reportFileOpener', () => ({
  openLocalReport: jest.fn(),
  downloadInBrowser: jest.fn(),
}));

jest.mock('../services/reportFileStore', () => ({
  canKeepReportFiles: true,
  findLocalReport: jest.fn(),
  saveReportFile: jest.fn(),
}));

jest.mock('../services/reportHistoryService', () => ({
  ...jest.requireActual('../services/reportHistoryService'),
  fetchReportDownloadLink: jest.fn(),
}));

const onlineMock = isOnline as jest.Mock;
const openMock = openLocalReport as jest.Mock;
const findLocalMock = findLocalReport as jest.Mock;
const saveMock = saveReportFile as jest.Mock;
const linkMock = fetchReportDownloadLink as jest.Mock;

const REPORT: ReportHistoryItem = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileName: 'relatorio.pdf',
  fileBytesSize: 100,
  period: { from: '2026-10-01', to: '2026-10-31' },
  generatedAt: '2026-11-12T10:00:00.000Z',
};

const LOCAL = { uri: 'file://relatorio.pdf', contentUri: 'content://r' };

function renderFile(onDownloaded = jest.fn()) {
  const result = {
    current: null as unknown as ReturnType<typeof useReportFile>,
  };

  function TestHarness() {
    result.current = useReportFile(REPORT, { onDownloaded });
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return result;
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

const validLink = (url: string) => ({
  url,
  expiresAt: Date.now() + 5 * 60_000,
});

beforeEach(() => {
  jest.resetAllMocks();
  onlineMock.mockResolvedValue(true);
  openMock.mockResolvedValue(undefined);
  findLocalMock.mockReturnValue(null);
});

describe('useReportFile', () => {
  it('opens the copy on the device without asking the API, even offline', async () => {
    findLocalMock.mockReturnValue(LOCAL);
    onlineMock.mockResolvedValue(false);

    const result = renderFile();
    act(() => result.current.open());
    await settle();

    expect(openMock).toHaveBeenCalledWith(LOCAL);
    expect(linkMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('done');
  });

  it('says it needs a connection when there is no copy and no network', async () => {
    onlineMock.mockResolvedValue(false);

    const result = renderFile();
    act(() => result.current.open());
    await settle();

    expect(linkMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('offline');
  });

  it('downloads, keeps and opens the file, and reports it as downloaded', async () => {
    const onDownloaded = jest.fn();
    linkMock.mockResolvedValue(validLink('https://s3/a'));
    saveMock.mockResolvedValue(LOCAL);

    const result = renderFile(onDownloaded);
    act(() => result.current.open());
    await settle();

    expect(saveMock).toHaveBeenCalledWith('user-1', REPORT, 'https://s3/a');
    expect(onDownloaded).toHaveBeenCalledWith('report-1');
    expect(openMock).toHaveBeenCalledWith(LOCAL);
    expect(result.current.status).toBe('done');
  });

  it('asks for a new link when the one it got is about to expire', async () => {
    linkMock
      .mockResolvedValueOnce({ url: 'https://s3/old', expiresAt: Date.now() })
      .mockResolvedValueOnce(validLink('https://s3/new'));
    saveMock.mockResolvedValue(LOCAL);

    const result = renderFile();
    act(() => result.current.open());
    await settle();

    expect(saveMock).toHaveBeenCalledWith('user-1', REPORT, 'https://s3/new');
  });

  it('tries once more with a new link when the download fails', async () => {
    linkMock
      .mockResolvedValueOnce(validLink('https://s3/expired'))
      .mockResolvedValueOnce(validLink('https://s3/fresh'));
    saveMock.mockRejectedValueOnce(new Error('403')).mockResolvedValue(LOCAL);

    const result = renderFile();
    act(() => result.current.open());
    await settle();

    expect(saveMock).toHaveBeenLastCalledWith(
      'user-1',
      REPORT,
      'https://s3/fresh',
    );
    expect(result.current.status).toBe('done');
  });

  it('fails when the second try fails too', async () => {
    linkMock.mockResolvedValue(validLink('https://s3/a'));
    saveMock.mockRejectedValue(new Error('broken'));

    const result = renderFile();
    act(() => result.current.open());
    await settle();

    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('failed');
  });

  it('says the report is gone when the API no longer has it', async () => {
    const { ApiError } = jest.requireActual('shared/services/apiClient');
    linkMock.mockRejectedValue(new ApiError('gone', 'REPORT_NOT_FOUND', 404));

    const result = renderFile();
    act(() => result.current.open());
    await settle();

    expect(result.current.status).toBe('missing');
  });
});
