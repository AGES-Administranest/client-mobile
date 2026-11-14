import ReactTestRenderer, { act } from 'react-test-renderer';

import { useReportHistory } from './useReportHistory';
import type {
  ReportHistoryItem,
  ReportHistoryPage,
} from '../domain/report.types';
import { findLocalReport } from '../services/reportFileStore';
import { fetchReportHistory } from '../services/reportHistoryService';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'id-token' },
    account: { id: 'user-1' },
  }),
}));

jest.mock('../services/reportHistoryService', () => ({
  fetchReportHistory: jest.fn(),
}));

jest.mock('../services/reportFileStore', () => ({
  findLocalReport: jest.fn(),
}));

const fetchMock = fetchReportHistory as jest.MockedFunction<
  typeof fetchReportHistory
>;
const findLocalMock = findLocalReport as jest.MockedFunction<
  typeof findLocalReport
>;

function report(id: string, day: number): ReportHistoryItem {
  return {
    id,
    kind: 'GENERAL_REPORT',
    fileName: `${id}.pdf`,
    fileBytesSize: 100,
    period: { from: '2026-10-01', to: '2026-10-31' },
    generatedAt: `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`,
  };
}

function pageOf(
  reports: ReportHistoryItem[],
  hasMore: boolean,
): ReportHistoryPage {
  return { items: reports, hasMore };
}

function renderHistory() {
  const result = {
    current: null as unknown as ReturnType<typeof useReportHistory>,
  };

  function TestHarness() {
    result.current = useReportHistory();
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<TestHarness />);
  });

  return result;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

const ids = (list: ReportHistoryItem[]) => list.map(item => item.id);

beforeEach(() => {
  fetchMock.mockReset();
  findLocalMock.mockReset();
  findLocalMock.mockReturnValue(null);
});

describe('useReportHistory', () => {
  it('lists the first page, newest generation first', async () => {
    fetchMock.mockResolvedValue(
      pageOf([report('old', 1), report('new', 12)], false),
    );

    const result = renderHistory();
    expect(result.current.isLoading).toBe(true);
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('id-token', 1);
    expect(result.current.isLoading).toBe(false);
    expect(ids(result.current.reports)).toEqual(['new', 'old']);
  });

  it('shows the error and loads again on retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    fetchMock.mockResolvedValueOnce(pageOf([report('a', 1)], false));

    const result = renderHistory();
    await flush();
    expect(result.current.hasError).toBe(true);
    expect(result.current.reports).toEqual([]);

    act(() => result.current.retry());
    await flush();

    expect(result.current.hasError).toBe(false);
    expect(ids(result.current.reports)).toEqual(['a']);
  });

  it('appends the next page without repeating a report', async () => {
    fetchMock.mockResolvedValueOnce(
      pageOf([report('c', 3), report('b', 2)], true),
    );
    fetchMock.mockResolvedValueOnce(
      pageOf([report('b', 2), report('a', 1)], false),
    );

    const result = renderHistory();
    await flush();
    act(() => result.current.loadMore());
    await flush();

    expect(fetchMock).toHaveBeenLastCalledWith('id-token', 2);
    expect(ids(result.current.reports)).toEqual(['c', 'b', 'a']);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not ask for another page after the last one', async () => {
    fetchMock.mockResolvedValue(pageOf([report('a', 1)], false));

    const result = renderHistory();
    await flush();
    act(() => result.current.loadMore());
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the list when the next page fails', async () => {
    fetchMock.mockResolvedValueOnce(pageOf([report('a', 1)], true));
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = renderHistory();
    await flush();
    act(() => result.current.loadMore());
    await flush();

    expect(result.current.loadMoreFailed).toBe(true);
    expect(ids(result.current.reports)).toEqual(['a']);
  });

  it('marks the reports that already have a copy on the device', async () => {
    findLocalMock.mockImplementation((_user, item) =>
      item.id === 'kept' ? { uri: 'file://kept', contentUri: 'c' } : null,
    );
    fetchMock.mockResolvedValue(
      pageOf([report('kept', 2), report('remote', 1)], false),
    );

    const result = renderHistory();
    await flush();

    expect([...result.current.downloadedIds]).toEqual(['kept']);

    act(() => result.current.markDownloaded('remote'));
    expect(result.current.downloadedIds.has('remote')).toBe(true);
  });

  it('drops a deleted report from the list', async () => {
    fetchMock.mockResolvedValue(
      pageOf([report('a', 2), report('b', 1)], false),
    );

    const result = renderHistory();
    await flush();
    act(() => result.current.forget('a'));

    expect(ids(result.current.reports)).toEqual(['b']);
  });
});
