import ReactTestRenderer, { act } from 'react-test-renderer';

import { NetworkError } from 'shared/api';
import { ApiError } from 'shared/services/apiClient';

import { useReportHistory, type ReportHistoryState } from './useReportHistory';
import { REPORT_CATEGORIES } from '../domain/report.types';
import { generateReport } from '../services/reportHistoryService';
import {
  loadLastSelection,
  saveLastSelection,
} from '../services/reportSelectionStore';

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'id-token' },
    account: { id: 'user-1' },
  }),
}));
jest.mock('../services/reportHistoryService', () => ({
  fetchReportHistory: jest.fn(() => Promise.resolve([])),
  generateReport: jest.fn(),
  shareReport: jest.fn(),
}));
jest.mock('../services/reportSelectionStore', () => ({
  loadLastSelection: jest.fn(),
  saveLastSelection: jest.fn(() => Promise.resolve()),
}));

const generateMock = generateReport as jest.Mock;
const INPUT = {
  categories: ['financial', 'travel'] as const,
  from: '2026-10-15',
  to: '2026-11-14',
};

async function renderHook(): Promise<{ current: ReportHistoryState }> {
  const result = {} as { current: ReportHistoryState };
  function Probe() {
    result.current = useReportHistory();
    return null;
  }
  await act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  (loadLastSelection as jest.Mock).mockResolvedValue([...REPORT_CATEGORIES]);
});

describe('useReportHistory', () => {
  it('starts from the last selection of the user', async () => {
    (loadLastSelection as jest.Mock).mockResolvedValue(['travel']);

    const hook = await renderHook();

    expect(loadLastSelection).toHaveBeenCalledWith('user-1');
    expect(hook.current.lastSelection).toEqual(['travel']);
  });

  it('adds the report to the list and remembers the sections', async () => {
    generateMock.mockResolvedValue({
      id: 'report-1',
      fileName: 'a.pdf',
      generatedAt: '2026-11-12T00:00:00Z',
      fileUri: 'file:///a.pdf',
    });
    const hook = await renderHook();

    let result;
    await act(async () => {
      result = await hook.current.generate({
        ...INPUT,
        categories: [...INPUT.categories],
      });
    });

    expect(result).toEqual({ ok: true });
    expect(hook.current.items.map(item => item.id)).toEqual(['report-1']);
    expect(hook.current.lastSelection).toEqual(['financial', 'travel']);
    expect(saveLastSelection).toHaveBeenCalledWith('user-1', [
      'financial',
      'travel',
    ]);
  });

  it.each([
    ['no connection', new NetworkError('down'), 'offline'],
    [
      'a period longer than a year',
      new ApiError('too long', 'REPORT_PERIOD_TOO_LONG', 400),
      'periodTooLong',
    ],
    [
      'a refusal of the API',
      new ApiError('no', 'REPORT_SECTIONS_EMPTY', 400),
      'failed',
    ],
    ['an unexpected error', new Error('boom'), 'failed'],
  ])('reports %s and remembers nothing', async (_name, error, reason) => {
    generateMock.mockRejectedValue(error);
    const hook = await renderHook();

    let result;
    await act(async () => {
      result = await hook.current.generate({
        ...INPUT,
        categories: [...INPUT.categories],
      });
    });

    expect(result).toEqual({ ok: false, reason });
    expect(hook.current.isGenerating).toBe(false);
    expect(hook.current.items).toEqual([]);
    expect(saveLastSelection).not.toHaveBeenCalled();
  });
});
