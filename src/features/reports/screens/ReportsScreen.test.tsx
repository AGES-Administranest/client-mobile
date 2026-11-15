import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';
import { isOnline } from 'shared/services/network';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportsScreen } from './ReportsScreen';
import { fetchReportAvailability } from '../services/reportAvailabilityService';
import {
  createReport,
  fetchReportHistory,
  saveReport,
} from '../services/reportHistoryService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' }, account: { id: 'user-1' } }),
}));
jest.mock('features/profile', () => ({
  isMissingCrmv: () => false,
  useProfile: () => ({ state: { status: 'loading' }, reload: jest.fn() }),
}));
jest.mock('shared/services/network', () => ({
  isOnline: jest.fn(() => Promise.resolve(true)),
  onConnectionRestored: jest.fn(() => () => undefined),
}));
jest.mock('../services/reportAvailabilityService', () => ({
  fetchReportAvailability: jest.fn(),
}));
jest.mock('../services/reportHistoryService', () => ({
  fetchReportHistory: jest.fn(),
  fetchReportDownloadLink: jest.fn(),
  deleteReport: jest.fn(),
  isReportNotFound: jest.fn(() => false),
  createReport: jest.fn(),
  saveReport: jest.fn(),
  ReportDownloadError: class extends Error {},
}));
jest.mock('../services/reportFileStore', () => ({
  canKeepReportFiles: true,
  findLocalReport: jest.fn(() => null),
  saveReportFile: jest.fn(),
  removeReportFile: jest.fn(),
}));
jest.mock('../services/reportFileOpener', () => ({
  openLocalReport: jest.fn(),
  downloadInBrowser: jest.fn(),
}));
jest.mock('../services/reportSelectionStore', () => ({
  loadLastSelection: jest.fn(() => new Promise(() => {})),
  saveLastSelection: jest.fn(() => Promise.resolve()),
}));

const fetchHistoryMock = fetchReportHistory as jest.Mock;
const fetchAvailability = jest.mocked(fetchReportAvailability);
const isOnlineMock = jest.mocked(isOnline);

const STORED_REPORT = {
  id: 'report-1',
  kind: 'GENERAL_REPORT',
  fileBytesSize: 40_333,
  period: { from: '2026-10-01', to: '2026-10-31' },
  fileName: 'administranest_relatorio-geral_2026-10-01_2026-10-31.pdf',
  generatedAt: '2026-11-01T12:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchHistoryMock.mockResolvedValue({ items: [], hasMore: false });
  isOnlineMock.mockResolvedValue(true);
  fetchAvailability.mockResolvedValue({ total: 1 });
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const REAL_TIMERS = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

// The default period is built from today, so the date is pinned; only Date
// is faked, timers stay real.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(Date.UTC(2026, 10, 2, 15)),
    doNotFake: [...REAL_TIMERS],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

// The invoice package card only works when the app wires its callback, so the
// tests wire it unless a case says otherwise.
async function render(props: React.ComponentProps<typeof ReportsScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <ReportsScreen onGenerateInvoicePackage={jest.fn()} {...props} />
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return renderer!;
}

function pressable(
  renderer: ReactTestRenderer.ReactTestRenderer,
  match: (label: string) => boolean,
) {
  return renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      match(node.props.accessibilityLabel ?? ''),
  )[0];
}

function tab(renderer: ReactTestRenderer.ReactTestRenderer, name: string) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === name),
  )[0];
}

async function press(instance: ReactTestRenderer.ReactTestInstance) {
  await act(async () => {
    await instance.props.onPress();
  });
}

function dayCell(renderer: ReactTestRenderer.ReactTestRenderer, date: string) {
  return renderer.root.find(
    node =>
      node.props.testID === date && typeof node.props.onPress === 'function',
  );
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

function dateField(
  renderer: ReactTestRenderer.ReactTestRenderer,
  name: string,
) {
  return pressable(renderer, label => label.startsWith(`${name}: `));
}

function dateFieldLabels(renderer: ReactTestRenderer.ReactTestRenderer) {
  return [
    dateField(renderer, 'Data de início').props.accessibilityLabel,
    dateField(renderer, 'Data de fim').props.accessibilityLabel,
  ];
}

function isCalendarShown(renderer: ReactTestRenderer.ReactTestRenderer) {
  return (
    renderer.root.findAll(node => node.props.testID === '2026-11-10').length > 0
  );
}

describe('ReportsScreen', () => {
  it('shows the two report cards, the period and the history access', async () => {
    const renderer = await render();
    const output = textsOf(renderer);

    expect(output).toContain('Relatório Geral');
    expect(output).toContain('Pacote de Notas Fiscais para IR');
    expect(dateFieldLabels(renderer)).toEqual([
      'Data de início: 01/11/2026',
      'Data de fim: 02/11/2026',
    ]);
    expect(output).toContain('Histórico de relatórios');
  });

  it('shows the invoices section and the add-note button below the report history', async () => {
    const output = textsOf(await render());

    expect(output).toContain('Notas fiscais');
    expect(output).toContain('Adicionar nota');
    expect(output.indexOf('Histórico de relatórios')).toBeLessThan(
      output.lastIndexOf('Notas fiscais'),
    );
    expect(output.lastIndexOf('Notas fiscais')).toBeLessThan(
      output.indexOf('Adicionar nota'),
    );
  });

  it('hands the chosen period of the invoice package to the caller', async () => {
    const onGenerateInvoicePackage = jest.fn();
    const renderer = await render({ onGenerateInvoicePackage });

    await press(
      pressable(renderer, label => label === 'Pacote de Notas Fiscais para IR'),
    );

    expect(onGenerateInvoicePackage).toHaveBeenCalledWith({
      from: '2026-11-01',
      to: '2026-11-02',
    });
  });

  it('generates the general report of the chosen period with the sections picked', async () => {
    (createReport as jest.Mock).mockResolvedValue({ id: 'report-1' });
    (saveReport as jest.Mock).mockResolvedValue(STORED_REPORT);
    const renderer = await render();

    await press(pressable(renderer, label => label === 'Relatório Geral'));
    await press(
      renderer.root.findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node
            .findAllByType('Text' as never)
            .some(text => text.props.children === 'Gerar'),
      )[0],
    );

    expect(createReport).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({ from: '2026-11-01', to: '2026-11-02' }),
    );
    expect(textsOf(renderer)).toContain(STORED_REPORT.fileName);
  });

  it('warns that the period has no records instead of opening the sections', async () => {
    fetchAvailability.mockResolvedValue({ total: 0 });
    const renderer = await render();

    await press(pressable(renderer, label => label === 'Relatório Geral'));

    expect(fetchAvailability).toHaveBeenCalledWith('tok', {
      from: '2026-11-01',
      to: '2026-11-02',
    });
    expect(textsOf(renderer)).toContain('Não há registros neste período');
    expect(textsOf(renderer)).not.toContain('Selecione as categorias');

    await press(tab(renderer, 'Mês anterior'));

    expect(textsOf(renderer)).not.toContain('Não há registros neste período');
  });

  it('warns that generating reports needs internet when offline', async () => {
    isOnlineMock.mockResolvedValue(false);
    const renderer = await render();

    await press(pressable(renderer, label => label === 'Relatório Geral'));

    expect(fetchAvailability).not.toHaveBeenCalled();
    expect(textsOf(renderer)).toContain(
      'Gerar relatórios exige conexão com a internet',
    );
    expect(textsOf(renderer)).not.toContain('Selecione as categorias');
  });

  it('lists the reports kept by the backend', async () => {
    fetchHistoryMock.mockResolvedValue({
      items: [STORED_REPORT],
      hasMore: false,
    });

    const renderer = await render();

    expect(fetchHistoryMock).toHaveBeenCalledWith('tok', 1);
    expect(textsOf(renderer)).toContain(STORED_REPORT.fileName);
  });

  it.each([
    ['Mês atual', '01/11/2026', '02/11/2026', '2026-11-01', '2026-11-02'],
    ['Mês anterior', '01/10/2026', '31/10/2026', '2026-10-01', '2026-10-31'],
    ['Ano atual', '01/01/2026', '02/11/2026', '2026-01-01', '2026-11-02'],
  ])(
    'the %s shortcut fills both date fields and sends YYYY-MM-DD',
    async (name, start, end, from, to) => {
      const onGenerateInvoicePackage = jest.fn();
      const renderer = await render({ onGenerateInvoicePackage });

      await press(tab(renderer, name));

      expect(dateFieldLabels(renderer)).toEqual([
        `Data de início: ${start}`,
        `Data de fim: ${end}`,
      ]);
      expect(isCalendarShown(renderer)).toBe(false);

      await press(
        pressable(
          renderer,
          title => title === 'Pacote de Notas Fiscais para IR',
        ),
      );

      expect(onGenerateInvoicePackage).toHaveBeenCalledWith({ from, to });
    },
  );

  it('shows the calendar only for the custom period', async () => {
    const renderer = await render();

    expect(isCalendarShown(renderer)).toBe(false);

    await press(tab(renderer, 'Personalizado'));

    expect(isCalendarShown(renderer)).toBe(true);

    await press(tab(renderer, 'Mês atual'));

    expect(isCalendarShown(renderer)).toBe(false);
  });

  it.each(['Data de início', 'Data de fim'])(
    'a tap on %s moves to the custom period and keeps the dates',
    async name => {
      const renderer = await render();

      await press(dateField(renderer, name));

      expect(
        tab(renderer, 'Personalizado').props.accessibilityState.selected,
      ).toBe(true);
      expect(isCalendarShown(renderer)).toBe(true);
      expect(dateFieldLabels(renderer)).toEqual([
        'Data de início: 01/11/2026',
        'Data de fim: 02/11/2026',
      ]);
    },
  );

  it('blocks the days after today in the calendar', async () => {
    const renderer = await render();

    await press(tab(renderer, 'Personalizado'));

    const tomorrow = renderer.root.find(
      node =>
        node.props.testID === '2026-11-03' &&
        'accessibilityState' in node.props,
    );
    expect(tomorrow.props.disabled).toBe(true);
    expect(dayCell(renderer, '2026-11-02')).toBeDefined();
  });

  it('keeps the cards disabled until the custom period has both ends', async () => {
    const renderer = await render();
    const generalCard = () =>
      pressable(renderer, label => label === 'Relatório Geral');

    await press(tab(renderer, 'Personalizado'));
    await press(dayCell(renderer, '2026-11-01'));

    expect(dateFieldLabels(renderer)).toEqual([
      'Data de início: 01/11/2026',
      'Data de fim: Selecione',
    ]);
    expect(generalCard().props.disabled).toBe(true);

    await press(dayCell(renderer, '2026-11-02'));

    expect(generalCard().props.disabled).toBe(false);
    expect(dateFieldLabels(renderer)).toEqual([
      'Data de início: 01/11/2026',
      'Data de fim: 02/11/2026',
    ]);
  });

  it('disables the invoice package while it is not wired and drops the history link while there is no report', async () => {
    const renderer = await render({ onGenerateInvoicePackage: undefined });

    expect(
      pressable(renderer, label => label === 'Relatório Geral').props.disabled,
    ).toBe(false);
    expect(
      pressable(renderer, label => label === 'Pacote de Notas Fiscais para IR')
        .props.disabled,
    ).toBe(true);
    expect(textsOf(renderer)).toContain('Histórico de relatórios');
    expect(
      pressable(renderer, label => label.includes('Histórico de relatórios')),
    ).toBeUndefined();
  });

  it('opens the history', async () => {
    fetchHistoryMock.mockResolvedValue({
      items: [STORED_REPORT],
      hasMore: false,
    });
    const renderer = await render();

    await press(
      pressable(
        renderer,
        label => label.includes('Ver todos') && label.includes('Histórico'),
      ),
    );

    expect(renderer.root.findByType(ReportHistoryScreen).props.visible).toBe(
      true,
    );
  });
});
