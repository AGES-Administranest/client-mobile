import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { RecentInvoicesSection } from './RecentInvoicesSection';
import type { Invoice, InvoicePage } from '../domain/invoice.types';
import { fetchInvoices } from '../services/invoiceService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' } }),
}));

jest.mock('../services/invoiceService', () => ({
  fetchInvoices: jest.fn(),
}));

const fetchMock = fetchInvoices as jest.MockedFunction<typeof fetchInvoices>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function invoice(number: string, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: `invoice-${number}`,
    number,
    kind: 'SERVICE',
    issuerName: 'Vet Farma',
    takerName: 'HospVet Sul',
    takerCnpj: '12.345.678/0001-90',
    amount: 100,
    issuedAt: '2026-04-22T12:00:00.000Z',
    syncStatus: 'SYNCED',
    hasOriginalFile: true,
    ...overrides,
  };
}

function page(items: Invoice[]): InvoicePage {
  return { items, hasMore: false };
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
  fetchMock.mockReset();
});

describe('RecentInvoicesSection', () => {
  it('shows the title, the see-all link and a card per invoice', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458')]));
    const { texts } = await renderSection();

    expect(texts()).toContain('Notas fiscais');
    expect(texts()).toContain('Ver todos');
    expect(texts()).toContain('HospVet Sul');
    expect(texts()).toContain('Arquivo original');
  });

  it('marks the original file only on the invoices that have it', async () => {
    fetchMock.mockResolvedValue(
      page([invoice('000458'), invoice('000457', { hasOriginalFile: false })]),
    );
    const { texts } = await renderSection();

    expect(texts().match(/Arquivo original/g)).toHaveLength(1);
  });

  it('shows only the few most recent invoices', async () => {
    fetchMock.mockResolvedValue(
      page(Array.from({ length: 8 }, (_, index) => invoice(`${index}`))),
    );
    const { renderer } = await renderSection();

    expect(
      renderer.root.findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node.props.accessibilityLabel === undefined,
      ),
    ).toHaveLength(5);
  });

  it('shows the empty message when there is no invoice', async () => {
    fetchMock.mockResolvedValue(page([]));
    const { texts } = await renderSection();

    expect(texts()).toContain('Nenhuma nota fiscal registrada.');
  });

  it('shows an error message when loading fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { texts } = await renderSection();

    expect(texts()).toContain('Não foi possível carregar as notas fiscais.');
  });

  it('shows the loading text while the invoices are coming', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { texts } = await renderSection();

    expect(texts()).toContain('Carregando notas fiscais...');
  });

  it('opens no sheet and no list before a tap', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458')]));
    const { texts } = await renderSection();

    expect(texts()).not.toContain('Nota Fiscal 000458');
  });

  it('tapping a card opens the detail of that invoice', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458')]));
    const { renderer, texts } = await renderSection();

    await press(renderer, 'button');

    expect(texts()).toContain('Nota Fiscal 000458');
    expect(texts()).toContain('CNPJ do tomador');
  });

  it('tapping "Ver todos" opens the full list', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458')]));
    const { renderer } = await renderSection();

    await press(renderer, 'link');

    expect(fetchMock).toHaveBeenCalledWith('tok', {}, 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
