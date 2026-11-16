import ReactTestRenderer, { act } from 'react-test-renderer';

import { NetworkError } from 'shared/api';
import { ApiError, RequestTimeoutError } from 'shared/services/apiClient';

import {
  useGenerateReport,
  type GenerateReportState,
} from './useGenerateReport';
import {
  REPORT_CATEGORIES,
  type GeneratedReport,
} from '../domain/report.types';
import {
  createReport,
  ReportDownloadError,
  saveReport,
} from '../services/reportHistoryService';
import {
  loadLastSelection,
  saveLastSelection,
} from '../services/reportSelectionStore';

let mockAccount: { id: string } | null = { id: 'user-1' };

jest.mock('features/auth', () => ({
  useAuth: () => ({
    session: { idToken: 'id-token' },
    account: mockAccount,
  }),
}));
jest.mock('../services/reportHistoryService', () => ({
  createReport: jest.fn(),
  saveReport: jest.fn(),
  ReportDownloadError: class extends Error {},
}));
jest.mock('../services/reportSelectionStore', () => ({
  loadLastSelection: jest.fn(),
  saveLastSelection: jest.fn(() => Promise.resolve()),
}));

const createMock = createReport as jest.Mock;
const saveMock = saveReport as jest.Mock;

const INPUT = {
  categories: ['financial', 'travel'] as const,
  from: '2026-10-15',
  to: '2026-11-14',
};

const NOW = Date.parse('2026-11-14T12:00:00Z');

const GENERATED: GeneratedReport = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileName: 'a.pdf',
  period: { from: INPUT.from, to: INPUT.to },
  sections: ['FINANCIAL', 'TRIPS'],
  generatedAt: '2026-11-12T00:00:00Z',
  downloadUrl: 'https://bucket.example/report-1',
  downloadUrlExpiresAt: NOW + 5 * 60_000,
  professionalIdComplete: true,
};

const SAVED = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileName: 'a.pdf',
  fileBytesSize: null,
  period: { from: INPUT.from, to: INPUT.to },
  generatedAt: '2026-11-12T00:00:00Z',
};

const onGenerated = jest.fn();

async function renderHook(): Promise<{ current: GenerateReportState }> {
  const result = {} as { current: GenerateReportState };
  function Probe() {
    result.current = useGenerateReport({ onGenerated });
    return null;
  }
  await act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
  return result;
}

async function generate(
  hook: { current: GenerateReportState },
  input: Parameters<GenerateReportState['generate']>[0] = {
    ...INPUT,
    categories: [...INPUT.categories],
  },
) {
  let result;
  await act(async () => {
    result = await hook.current.generate(input);
  });
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockAccount = { id: 'user-1' };
  (loadLastSelection as jest.Mock).mockResolvedValue([...REPORT_CATEGORIES]);
  createMock.mockResolvedValue(GENERATED);
  saveMock.mockResolvedValue(SAVED);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useGenerateReport', () => {
  it('starts from the last selection of the user', async () => {
    (loadLastSelection as jest.Mock).mockResolvedValue(['travel']);

    const hook = await renderHook();

    expect(loadLastSelection).toHaveBeenCalledWith('user-1');
    expect(hook.current.lastSelection).toEqual(['travel']);
  });

  it('offers every section while nothing is remembered', async () => {
    mockAccount = null;

    const hook = await renderHook();

    expect(loadLastSelection).not.toHaveBeenCalled();
    expect(hook.current.lastSelection).toEqual([...REPORT_CATEGORIES]);
  });

  it('hands the report to the list and remembers the sections', async () => {
    const hook = await renderHook();

    const result = await generate(hook);

    expect(result).toEqual({
      ok: true,
      report: expect.objectContaining({ id: expect.any(String) }),
    });
    expect(saveMock).toHaveBeenCalledWith('user-1', GENERATED);
    expect(onGenerated).toHaveBeenCalledWith(SAVED);
    expect(hook.current.lastSelection).toEqual(['financial', 'travel']);
    expect(saveLastSelection).toHaveBeenCalledWith('user-1', [
      'financial',
      'travel',
    ]);
  });

  it('asks the backend once when generate is called twice in a row', async () => {
    const hook = await renderHook();

    await act(async () => {
      const input = { ...INPUT, categories: [...INPUT.categories] };
      await Promise.all([
        hook.current.generate(input),
        hook.current.generate(input),
      ]);
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no connection', new NetworkError('down'), 'offline'],
    [
      'no answer in time',
      new RequestTimeoutError('POST', '/reports', 60_000),
      'offline',
    ],
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
    createMock.mockRejectedValue(error);
    const hook = await renderHook();

    const result = await generate(hook);

    expect(result).toEqual({ ok: false, reason });
    expect(saveMock).not.toHaveBeenCalled();
    expect(hook.current.isGenerating).toBe(false);
    expect(onGenerated).not.toHaveBeenCalled();
    expect(saveLastSelection).not.toHaveBeenCalled();
  });

  describe('when the PDF does not reach the device', () => {
    beforeEach(() => {
      saveMock.mockRejectedValueOnce(new ReportDownloadError('lost'));
    });

    it('says the report was generated but not downloaded', async () => {
      const hook = await renderHook();

      const result = await generate(hook);

      expect(result).toEqual({ ok: false, reason: 'downloadFailed' });
      expect(onGenerated).not.toHaveBeenCalled();
    });

    it('downloads the same report again instead of generating another', async () => {
      const hook = await renderHook();
      await generate(hook);

      const result = await generate(hook);

      expect(result).toEqual({
        ok: true,
        report: expect.objectContaining({ id: expect.any(String) }),
      });
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(saveMock).toHaveBeenCalledTimes(2);
      expect(onGenerated).toHaveBeenCalledTimes(1);
    });

    it('generates again for other sections', async () => {
      const hook = await renderHook();
      await generate(hook);

      await generate(hook, { ...INPUT, categories: ['financial'] });

      expect(createMock).toHaveBeenCalledTimes(2);
    });

    it('generates again once the download link expired', async () => {
      const hook = await renderHook();
      await generate(hook);
      jest.spyOn(Date, 'now').mockReturnValue(GENERATED.downloadUrlExpiresAt);

      await generate(hook);

      expect(createMock).toHaveBeenCalledTimes(2);
    });
  });
});
