import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { InvoicesScreen } from './InvoicesScreen';
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

function invoice(number: string, takerName = 'Clínica Boa Vida'): Invoice {
  return {
    id: `invoice-${number}`,
    number,
    kind: 'SERVICE',
    issuerName: 'Vet Farma',
    takerName,
    takerCnpj: '12.345.678/0001-90',
    amount: 100,
    issuedAt: '2026-08-10T12:00:00.000Z',
    syncStatus: 'SYNCED',
  };
}

function page(items: Invoice[], hasMore = false): InvoicePage {
  return { items, hasMore };
}

async function renderScreen(onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <InvoicesScreen visible onClose={onClose} />
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
});

afterEach(() => {
  jest.useRealTimers();
});

describe('InvoicesScreen', () => {
  it('lists the invoices the service returns', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458'), invoice('000457')]));
    const { texts } = await renderScreen();

    expect(fetchMock).toHaveBeenCalledWith('tok', {}, 1);
    expect(texts()).toContain('Nota Fiscal 000458');
    expect(texts()).toContain('Nota Fiscal 000457');
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

    expect(texts()).toContain('Nota Fiscal 000458');
  });

  it('searches once the typing pauses, and says so when nothing matches', async () => {
    fetchMock.mockResolvedValueOnce(page([invoice('000458')]));
    const { renderer, texts } = await renderScreen();

    fetchMock.mockResolvedValueOnce(page([]));
    const input = renderer.root.findByProps({
      accessibilityLabel: 'Nome, CNPJ ou número da nota',
    });

    act(() => input.props.onChangeText('zzzz'));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(fetchMock).toHaveBeenLastCalledWith('tok', { search: 'zzzz' }, 1);
    expect(texts()).toContain('Nenhuma nota fiscal encontrada para o filtro.');
  });

  it('opens the details of the invoice that was tapped', async () => {
    fetchMock.mockResolvedValue(page([invoice('000458')]));
    const { renderer, texts } = await renderScreen();

    const card = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Nota Fiscal 000458,') &&
        typeof node.props.onPress === 'function',
    );

    await act(async () => {
      card.props.onPress();
    });

    expect(texts()).toContain('CNPJ do tomador');
    expect(texts()).toContain('12.345.678/0001-90');
  });

  it('asks for the next page when the end of the list is reached', async () => {
    fetchMock
      .mockResolvedValueOnce(page([invoice('000458')], true))
      .mockResolvedValueOnce(page([invoice('000457')]));
    const { renderer, texts } = await renderScreen();

    const list = renderer.root.findByProps({ onEndReachedThreshold: 0.5 });

    await act(async () => {
      list.props.onEndReached();
    });

    expect(fetchMock).toHaveBeenLastCalledWith('tok', {}, 2);
    expect(texts()).toContain('Nota Fiscal 000457');
  });

  it('closes when the back button is pressed', async () => {
    fetchMock.mockResolvedValue(page([]));
    const onClose = jest.fn();
    const { renderer } = await renderScreen(onClose);

    const back = renderer.root.findByProps({ accessibilityLabel: 'Voltar' });

    act(() => back.props.onPress());

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
