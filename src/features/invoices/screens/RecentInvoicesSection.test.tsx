import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { RecentInvoicesSection } from './RecentInvoicesSection';
import { RecentInvoiceCard } from '../components/RecentInvoiceCard';
import type { ReportInvoice } from '../domain/reportInvoice';
import { fetchInvoices } from '../services/invoiceService';
import { fetchReportInvoices } from '../services/reportInvoiceService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' } }),
}));

jest.mock('../services/reportInvoiceService', () => ({
  fetchReportInvoices: jest.fn(),
}));

jest.mock('../services/invoiceService', () => ({
  fetchInvoices: jest.fn(async () => ({ items: [], hasMore: false })),
}));

const fetchReportMock = fetchReportInvoices as jest.MockedFunction<
  typeof fetchReportInvoices
>;
const fetchListMock = fetchInvoices as jest.MockedFunction<
  typeof fetchInvoices
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function invoice(id: string, overrides: Partial<ReportInvoice> = {}) {
  return {
    id,
    issueDate: '2026-04-22',
    takerName: 'HospVet Sul',
    hasOriginalFile: true,
    ...overrides,
  };
}

async function renderSection() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <RecentInvoicesSection />
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

  return { renderer, texts };
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  role: 'button' | 'link',
) {
  const target = renderer.root.findAll(
    node =>
      node.props.accessibilityRole === role &&
      node.props.accessibilityLabel === undefined,
  )[0];
  await act(async () => target.props.onPress());
}

beforeEach(() => {
  fetchReportMock.mockReset();
  fetchListMock.mockClear();
});

describe('RecentInvoicesSection', () => {
  it('asks for the recent invoices with the session token', async () => {
    fetchReportMock.mockResolvedValue([invoice('1')]);
    await renderSection();

    expect(fetchReportMock).toHaveBeenCalledWith('tok', 5);
  });

  it('shows the title, the see-all link and a card per invoice', async () => {
    fetchReportMock.mockResolvedValue([invoice('1'), invoice('2')]);
    const { renderer, texts } = await renderSection();

    expect(texts()).toContain('Notas fiscais');
    expect(texts()).toContain('Ver todos');
    expect(texts()).toContain('HospVet Sul');
    expect(texts()).toContain('22/04/2026');
    expect(renderer.root.findAllByType(RecentInvoiceCard)).toHaveLength(2);
  });

  it('marks the original file only on the invoices that have it', async () => {
    fetchReportMock.mockResolvedValue([
      invoice('1'),
      invoice('2', { hasOriginalFile: false }),
    ]);
    const { texts } = await renderSection();

    expect(texts().match(/Arquivo original/g)).toHaveLength(1);
  });

  it('shows the empty message when there is no invoice', async () => {
    fetchReportMock.mockResolvedValue([]);
    const { texts } = await renderSection();

    expect(texts()).toContain('Nenhuma nota fiscal registrada.');
  });

  it('shows an error message when loading fails', async () => {
    fetchReportMock.mockRejectedValue(new Error('offline'));
    const { texts } = await renderSection();

    expect(texts()).toContain('Não foi possível carregar as notas fiscais.');
  });

  it('shows the loading text while the invoices are coming', async () => {
    fetchReportMock.mockReturnValue(new Promise(() => undefined));
    const { texts } = await renderSection();

    expect(texts()).toContain('Carregando notas fiscais...');
  });

  it('opens no sheet and no list before a tap', async () => {
    fetchReportMock.mockResolvedValue([invoice('1')]);
    const { texts } = await renderSection();

    expect(texts()).not.toContain('Detalhes da nota');
    expect(fetchListMock).not.toHaveBeenCalled();
  });

  it('tapping a card opens the detail of that invoice', async () => {
    fetchReportMock.mockResolvedValue([invoice('1')]);
    const { renderer, texts } = await renderSection();

    await press(renderer, 'button');

    expect(texts()).toContain('Detalhes da nota');
    expect(texts()).toContain('Tomador');
    expect(texts()).toContain('Disponível');
  });

  it('the detail says when the original file is unavailable', async () => {
    fetchReportMock.mockResolvedValue([
      invoice('1', { hasOriginalFile: false }),
    ]);
    const { renderer, texts } = await renderSection();

    await press(renderer, 'button');

    expect(texts()).toContain('Indisponível');
  });

  it('tapping "Ver todos" opens the full list', async () => {
    fetchReportMock.mockResolvedValue([invoice('1')]);
    const { renderer } = await renderSection();

    await press(renderer, 'link');

    expect(fetchListMock).toHaveBeenCalledWith('tok', {}, 1);
  });
});
