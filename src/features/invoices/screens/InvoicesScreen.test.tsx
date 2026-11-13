import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import { InvoicesScreen } from './InvoicesScreen';
import type { Invoice, InvoicePage } from '../domain/invoice.types';
import { fetchInvoices } from '../services/invoiceService';
import { downloadTaxPackage } from '../services/taxPackageService';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' } }),
}));

jest.mock('../services/invoiceService', () => ({
  fetchInvoices: jest.fn(),
}));

jest.mock('../services/taxPackageService', () => ({
  ...jest.requireActual('../services/taxPackageService'),
  downloadTaxPackage: jest.fn(),
}));

const fetchMock = fetchInvoices as jest.MockedFunction<typeof fetchInvoices>;
const downloadMock = downloadTaxPackage as jest.MockedFunction<
  typeof downloadTaxPackage
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function invoice(number: string, issuerName = 'Vet Farma'): Invoice {
  return {
    id: `invoice-${number}`,
    number,
    kind: 'SERVICE',
    issuerName,
    issuerCity: 'São Paulo, SP',
    takerName: 'Clínica Boa Vida',
    takerCnpj: '12.345.678/0001-90',
    amount: 100,
    issuedAt: '2026-08-10T12:00:00.000Z',
    syncStatus: 'SYNCED',
  };
}

function page(items: Invoice[], hasMore = false): InvoicePage {
  return { items, hasMore, total: items.length };
}

async function renderScreen(onClose = jest.fn(), onAddInvoice = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <InvoicesScreen
            visible
            onClose={onClose}
            onAddInvoice={onAddInvoice}
          />
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

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  downloadMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('InvoicesScreen', () => {
  it('lists the invoices the service returns', async () => {
    fetchMock.mockResolvedValue(
      page([invoice('000458', 'HospVet Sul'), invoice('000457', 'Pet Center')]),
    );
    const { texts } = await renderScreen();

    expect(fetchMock).toHaveBeenCalledWith('tok', {}, 1);
    expect(texts()).toContain('HospVet Sul');
    expect(texts()).toContain('Pet Center');
    expect(texts()).toContain('2 notas fiscais');
  });

  it('shows the empty state when there are no invoices at all', async () => {
    fetchMock.mockResolvedValue(page([]));
    const { texts } = await renderScreen();

    expect(texts()).toContain('Nenhuma nota fiscal registrada.');
  });

  it('shows an error with a retry, not the empty state, when loading fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('500'));
    fetchMock.mockResolvedValueOnce(page([invoice('000458')]));
    const { renderer, texts } = await renderScreen();

    expect(texts()).toContain('Não foi possível carregar as notas fiscais.');
    expect(texts()).not.toContain('Nenhuma nota fiscal registrada.');

    const retry = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function' &&
        node.props.children === 'Tentar novamente',
    );

    await act(async () => {
      retry.props.onPress();
    });

    expect(texts()).toContain('Vet Farma');
  });

  it('opens the details of the invoice that was tapped', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458')]));
    const { renderer, texts } = await renderScreen();

    const card = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Vet Farma,') &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      card.props.onPress();
    });

    expect(texts()).toContain('CNPJ do tomador');
    expect(texts()).toContain('12.345.678/0001-90');
    expect(texts()).toContain('Baixar nota');
  });

  it('asks for the next page when the end of the list is reached', async () => {
    fetchMock
      .mockResolvedValueOnce(page([invoice('000458')], true))
      .mockResolvedValueOnce(page([invoice('000457', 'Pet Center')]));
    const { renderer, texts } = await renderScreen();

    const list = renderer.root.findByProps({ onEndReachedThreshold: 0.5 });

    await act(async () => {
      list.props.onEndReached();
    });

    expect(fetchMock).toHaveBeenLastCalledWith('tok', {}, 2);
    expect(texts()).toContain('Pet Center');
  });

  it('closes when the back button is pressed', async () => {
    fetchMock.mockResolvedValue(page([]));
    const onClose = jest.fn();
    const { renderer } = await renderScreen(onClose);

    const back = renderer.root.findByProps({ accessibilityLabel: 'Voltar' });

    act(() => back.props.onPress());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('starts the invoice flow from the add button', async () => {
    fetchMock.mockResolvedValue(page([]));
    const onAddInvoice = jest.fn();
    const { renderer } = await renderScreen(jest.fn(), onAddInvoice);

    const label = renderer.root.find(
      node =>
        (node.type as unknown) === 'Text' &&
        node.props.children === 'Adicionar nota fiscal',
    );
    let add = label.parent;

    while (add && typeof add.props.onPress !== 'function') {
      add = add.parent;
    }

    act(() => add!.props.onPress());

    expect(onAddInvoice).toHaveBeenCalledTimes(1);
  });

  describe('download all', () => {
    async function pressDownloadAll(
      renderer: ReactTestRenderer.ReactTestRenderer,
    ) {
      const label = renderer.root.find(
        node =>
          (node.type as unknown) === 'Text' &&
          node.props.children === 'Baixar tudo (ZIP)',
      );
      let button = label.parent;

      while (button && typeof button.props.onPress !== 'function') {
        button = button.parent;
      }

      await act(async () => {
        button!.props.onPress();
      });
    }

    it('downloads the zip with the id token and says it started', async () => {
      fetchMock.mockResolvedValue(page([]));
      downloadMock.mockResolvedValue(undefined);
      const { renderer, texts } = await renderScreen();

      await pressDownloadAll(renderer);

      expect(downloadMock).toHaveBeenCalledWith('tok');
      expect(texts()).toContain('Download iniciado.');
    });

    it('says so when there is no invoice with a file to download', async () => {
      fetchMock.mockResolvedValue(page([]));
      downloadMock.mockRejectedValue(
        new ApiError('nothing', 'TAX_PACKAGE_EMPTY', 404),
      );
      const { renderer, texts } = await renderScreen();

      await pressDownloadAll(renderer);

      expect(texts()).toContain('Nenhuma nota fiscal com arquivo para baixar.');
    });

    it('says so when the connection is down', async () => {
      fetchMock.mockResolvedValue(page([]));
      downloadMock.mockRejectedValue(new TypeError('no answer'));
      const { renderer, texts } = await renderScreen();

      await pressDownloadAll(renderer);

      expect(texts()).toContain(
        'Sem conexão. Verifique sua internet e tente de novo.',
      );
    });
  });
});