import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { EmptyState } from 'app/components/ui/empty-state';
import { I18nProvider } from 'shared/i18n';
import { isOnline } from 'shared/services/network';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportCard } from '../components/ReportCard';
import { ReportDetailSheet } from '../components/ReportDetailSheet';
import type { ReportHistoryItem } from '../domain/report.types';
import type { ReportHistoryState } from '../hooks/useReportHistory';
import { openLocalReport } from '../services/reportFileOpener';
import {
  findLocalReport,
  removeReportFile,
  saveReportFile,
} from '../services/reportFileStore';
import {
  deleteReport,
  fetchReportDownloadLink,
} from '../services/reportHistoryService';

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
  removeReportFile: jest.fn(),
}));

jest.mock('../services/reportHistoryService', () => ({
  ...jest.requireActual('../services/reportHistoryService'),
  fetchReportDownloadLink: jest.fn(),
  deleteReport: jest.fn(),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const LOCAL = {
  uri: 'file://relatorio.pdf',
  contentUri: 'content://r',
  name: 'relatorio.pdf',
  mimeType: 'application/pdf',
};

const onlineMock = isOnline as jest.Mock;
const openMock = openLocalReport as jest.Mock;
const findLocalMock = findLocalReport as jest.Mock;
const saveMock = saveReportFile as jest.Mock;
const removeFileMock = removeReportFile as jest.Mock;
const linkMock = fetchReportDownloadLink as jest.Mock;
const deleteMock = deleteReport as jest.Mock;

const GENERAL: ReportHistoryItem = {
  id: 'general',
  kind: 'GENERAL_REPORT',
  fileName: 'relatorio-geral.pdf',
  fileBytesSize: 2048,
  period: { from: '2026-10-01', to: '2026-10-31' },
  generatedAt: '2026-11-12T15:00:00.000Z',
};

const PACKAGE: ReportHistoryItem = {
  id: 'package',
  kind: 'TAX_PACKAGE',
  fileName: null,
  fileBytesSize: null,
  period: null,
  generatedAt: '2026-11-10T15:00:00.000Z',
};

function historyOf(
  overrides: Partial<ReportHistoryState> = {},
): ReportHistoryState {
  return {
    reports: [GENERAL, PACKAGE],
    downloadedIds: new Set(),
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    hasError: false,
    loadMoreFailed: false,
    loadMore: jest.fn(),
    retry: jest.fn(),
    markDownloaded: jest.fn(),
    forget: jest.fn(),
    ...overrides,
  };
}

async function renderScreen(history: ReportHistoryState) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <ReportHistoryScreen visible history={history} onClose={jest.fn()} />
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  const texts = () =>
    JSON.stringify(
      renderer.root
        .findAllByType('Text' as never)
        .map(node => node.props.children),
    );

  const detail = () => renderer.root.findByType(ReportDetailSheet).props;
  const confirm = () => renderer.root.findByType(ConfirmSheet).props;

  // In tests the closing animation ends at once, so a sheet's onClosed has
  // already run when the act settles.
  const run = (action: () => unknown) =>
    act(async () => {
      await action();
    });

  const openReport = (index: number) =>
    run(() => renderer.root.findAllByType(ReportCard)[index].props.onPress());

  return { renderer, texts, detail, confirm, run, openReport };
}

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  onlineMock.mockResolvedValue(true);
  findLocalMock.mockReturnValue(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ReportHistoryScreen', () => {
  it('lists each report with its kind, period, generation date and copy on the device', async () => {
    const { texts } = await renderScreen(
      historyOf({ downloadedIds: new Set(['general']) }),
    );

    expect(texts()).toContain('Relatório geral');
    expect(texts()).toContain(
      `${day('2026-10-01T12:00:00')} a ${day('2026-10-31T12:00:00')}`,
    );
    expect(texts()).toContain(`Gerado em ${day(GENERAL.generatedAt)}`);
    expect(texts()).toContain('No aparelho');
    expect(texts()).toContain('Pacote para o contador');
    expect(texts()).toContain('Período não informado');
  });

  it('shows the empty state when nothing was generated yet', async () => {
    const { renderer } = await renderScreen(historyOf({ reports: [] }));

    expect(renderer.root.findByType(EmptyState).props.message).toBe(
      'Nenhum relatório gerado ainda.',
    );
  });

  it('shows the error with a retry when the history could not load', async () => {
    const history = historyOf({ reports: [], hasError: true });
    const { renderer, texts, run } = await renderScreen(history);

    expect(texts()).toContain('Não foi possível carregar o histórico.');
    expect(renderer.root.findAllByType(EmptyState)).toHaveLength(0);

    const retry = renderer.root
      .findAllByType('Text' as never)
      .find(node => node.props.children === 'Tentar novamente');
    await run(() => retry!.props.onPress());

    expect(history.retry).toHaveBeenCalled();
  });

  it('opens the detail of the report tapped', async () => {
    const { detail, openReport } = await renderScreen(historyOf());

    await openReport(1);

    expect(detail().visible).toBe(true);
    expect(detail().title).toBe('Pacote para o contador');
    expect(detail().rows).toEqual(
      expect.arrayContaining([
        { label: 'Arquivo', value: 'Relatório sem nome' },
        { label: 'Tamanho', value: 'Não informado' },
      ]),
    );
    expect(detail().openLabel).toBe('Baixar relatório');
  });

  it('downloads a report not on the device, keeps it and opens it', async () => {
    const history = historyOf();
    linkMock.mockResolvedValue({
      url: 'https://s3/file',
      expiresAt: Date.now() + 300_000,
    });
    saveMock.mockResolvedValue(LOCAL);
    const { detail, openReport, run } = await renderScreen(history);

    await openReport(0);
    await run(() => detail().onOpen());

    expect(linkMock).toHaveBeenCalledWith('id-token', 'general');
    expect(saveMock).toHaveBeenCalledWith('user-1', GENERAL, 'https://s3/file');
    expect(openMock).toHaveBeenCalledWith(LOCAL);
    expect(history.markDownloaded).toHaveBeenCalledWith('general');
  });

  it('opens the copy already on the device without the API, even offline', async () => {
    onlineMock.mockResolvedValue(false);
    findLocalMock.mockReturnValue(LOCAL);
    const { detail, openReport, run } = await renderScreen(
      historyOf({ downloadedIds: new Set(['general']) }),
    );

    await openReport(0);
    expect(detail().openLabel).toBe('Abrir relatório');
    await run(() => detail().onOpen());

    expect(openMock).toHaveBeenCalledWith(LOCAL);
    expect(linkMock).not.toHaveBeenCalled();
  });

  it('says a download needs a connection when offline', async () => {
    onlineMock.mockResolvedValue(false);
    const { detail, openReport, run } = await renderScreen(historyOf());

    await openReport(0);
    await run(() => detail().onOpen());

    expect(detail().statusMessage).toBe(
      'Sem conexão. Conecte-se à internet para baixar este relatório.',
    );
    expect(linkMock).not.toHaveBeenCalled();
  });

  it('deletes only after the confirmation, then drops the copy and the item', async () => {
    deleteMock.mockResolvedValue(undefined);
    const history = historyOf();
    const { detail, confirm, openReport, run } = await renderScreen(history);

    await openReport(0);
    await run(() => detail().onDelete());

    expect(detail().visible).toBe(false);
    expect(confirm().visible).toBe(true);
    expect(confirm().title).toBe('Excluir relatório?');
    expect(confirm().message).toContain('relatorio-geral.pdf');
    expect(deleteMock).not.toHaveBeenCalled();

    await run(() => confirm().onConfirm());

    expect(deleteMock).toHaveBeenCalledWith('id-token', 'general');
    expect(removeFileMock).toHaveBeenCalledWith('user-1', 'general');
    expect(confirm().visible).toBe(false);
    expect(history.forget).toHaveBeenCalledWith('general');
  });

  it('keeps the item and says deleting needs a connection when offline', async () => {
    onlineMock.mockResolvedValue(false);
    const history = historyOf();
    const { detail, confirm, openReport, run } = await renderScreen(history);

    await openReport(0);
    await run(() => detail().onDelete());
    await run(() => confirm().onConfirm());

    expect(confirm().visible).toBe(true);
    expect(confirm().message).toBe(
      'Sem conexão. Excluir um relatório exige internet.',
    );
    expect(deleteMock).not.toHaveBeenCalled();
    expect(history.forget).not.toHaveBeenCalled();
  });

  it('goes back to the same detail when the deletion is cancelled', async () => {
    const { detail, confirm, openReport, run } = await renderScreen(
      historyOf(),
    );

    await openReport(0);
    await run(() => detail().onDelete());
    await run(() => confirm().onCancel());

    expect(confirm().visible).toBe(false);
    expect(detail().visible).toBe(true);
    expect(detail().title).toBe('Relatório geral');
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
