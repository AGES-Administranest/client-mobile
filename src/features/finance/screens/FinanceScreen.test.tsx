import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { EmptyState } from 'app/components/ui/empty-state';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { StockSyncProvider } from 'features/stock';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import { FinanceScreen } from './FinanceScreen';
import type { FinancialEntry } from '../domain/financialEntry';
import { STATEMENT_PAGE_SIZE } from '../domain/statement';
import {
  createFinancialEntry,
  deleteFinancialEntry,
  fetchFinancialCategories,
  fetchFinancialEntries,
  updateFinancialEntry,
} from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  createFinancialEntry: jest.fn(),
  deleteFinancialEntry: jest.fn(),
  fetchFinancialCategories: jest.fn(),
  fetchFinancialEntries: jest.fn(),
  updateFinancialEntry: jest.fn(),
}));
// A tela do atendimento busca os próprios dados: aqui basta saber que abriu.
jest.mock('features/procedures', () => {
  const { createElement } = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    AppointmentDetailScreen: ({
      appointmentId,
      onClose,
    }: {
      appointmentId: string | null;
      onClose: () => void;
    }) =>
      appointmentId
        ? createElement(
            Pressable,
            { accessibilityRole: 'button', onPress: onClose },
            createElement(Text, null, `Atendimento ${appointmentId}`),
          )
        : null,
  };
});
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

jest.mock('features/stock/services/stockMovementService', () => ({
  fetchStockMovements: jest.fn(() => Promise.resolve([])),
}));
jest.mock('features/stock/services/stockSyncService', () => ({
  ...jest.requireActual('features/stock/services/stockSyncService'),
  pushPendingMovements: jest.fn(async () => ({
    applied: [],
    duplicated: [],
    balances: [],
    needsAdjustment: [],
  })),
  pullStockMovements: jest.fn(async () => ({
    movements: [],
    balances: [],
    cursor: 'cursor-1',
    hasMore: false,
    afterId: null,
  })),
}));

const createMock = createFinancialEntry as jest.MockedFunction<
  typeof createFinancialEntry
>;
const fetchCategoriesMock = fetchFinancialCategories as jest.MockedFunction<
  typeof fetchFinancialCategories
>;
const fetchEntriesMock = fetchFinancialEntries as jest.MockedFunction<
  typeof fetchFinancialEntries
>;

const updateMock = updateFinancialEntry as jest.MockedFunction<
  typeof updateFinancialEntry
>;
const deleteMock = deleteFinancialEntry as jest.MockedFunction<
  typeof deleteFinancialEntry
>;

function entry(overrides: Partial<FinancialEntry>): FinancialEntry {
  return {
    id: 'entry-1',
    nature: 'EXPENSE',
    description: 'Combustível',
    category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
    scope: 'PROFESSIONAL',
    amount: 180,
    accrualDate: '2026-08-09T12:00:00.000Z',
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
    ...overrides,
  };
}

const ENTRIES: FinancialEntry[] = [
  entry({
    id: 'entry-1',
    nature: 'INCOME',
    description: 'Orquiectomia – Mel',
    category: {
      id: 'cat-fees',
      name: 'Professional fees',
      scope: 'PROFESSIONAL',
    },
    amount: 620,
    accrualDate: '2026-08-17T12:00:00.000Z',
    source: 'APPOINTMENT',
    origin: { type: 'APPOINTMENT', id: 'appointment-1' },
  }),
  entry({ id: 'entry-2', description: 'Combustível', amount: 180 }),
];

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

// O Pressable aparece duas vezes na árvore (o componente e o View nativo):
// o nativo não tem onPress. Uma linha do extrato também é um botão com a
// categoria escrita, mas tem o próprio nome (accessibilityLabel): fica de fora.
function pressByText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  const button = renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string' &&
      (node.props.role === 'button' ||
        ['button', 'radio'].includes(node.props.accessibilityRole)) &&
      (node.props.accessibilityLabel ?? text) === text &&
      node.findAllByType('Text' as never).some(t => t.props.children === text),
  );
  return act(async () => button.props.onPress());
}

function typeInto(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  value: string,
) {
  const field = renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
  return act(async () => field.props.onChangeText(value));
}

function scrollTo(
  renderer: ReactTestRenderer.ReactTestRenderer,
  offsetY: number,
) {
  const scroll = renderer.root.findByProps({ testID: 'finance-scroll' });
  return act(async () =>
    scroll.props.onScroll({
      nativeEvent: {
        contentOffset: { y: offsetY },
        layoutMeasurement: { height: 800 },
        contentSize: { height: 3000 },
      },
    }),
  );
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  mounted.splice(0).forEach(renderer => act(() => renderer.unmount()));
});

async function renderScreen() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <StockSyncProvider>
              <FinanceScreen />
            </StockSyncProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  mounted.push(renderer);
  return renderer;
}

beforeEach(() => {
  fetchEntriesMock.mockReset().mockResolvedValue(ENTRIES);
  fetchCategoriesMock.mockReset().mockResolvedValue([
    {
      id: 'cat-travel',
      name: 'Travel',
      nature: 'EXPENSE',
      defaultScope: 'PROFESSIONAL',
    },
  ]);
  createMock.mockReset().mockImplementation(async (_token, payload) => ({
    ...payload,
    category: { id: payload.categoryId, name: 'Travel', scope: 'PROFESSIONAL' },
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
  }));
});

test('mounts the stock movement history', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <StockSyncProvider>
              <FinanceScreen />
            </StockSyncProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(JSON.stringify(texts)).toContain('Histórico de movimentações');
  expect(
    renderer!.root.findAllByProps({ testID: 'finance-new-entry-button' }),
  ).not.toHaveLength(0);
});

test('opens the calculator from the header icon', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <StockSyncProvider>
              <FinanceScreen />
            </StockSyncProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  expect(textsOf(renderer!)).toContain('Finanças');
  expect(textsOf(renderer!)).not.toContain('Calculadora de hora');

  const open = renderer!.root.find(
    node =>
      node.props.accessibilityLabel === 'Abrir calculadora de hora' &&
      typeof node.props.onPress === 'function',
  );

  await act(async () => open.props.onPress());

  expect(textsOf(renderer!)).toContain('Calculadora de hora');

  const back = renderer!.root.find(
    node =>
      node.props.accessibilityLabel === 'Voltar' &&
      typeof node.props.onPress === 'function',
  );

  await act(async () => back.props.onPress());

  expect(textsOf(renderer!)).not.toContain('Calculadora de hora');
});

describe('month statement', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
      ],
    });
    jest.setSystemTime(new Date(2026, 7, 20, 15, 0));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('shows the current month, all scopes, under the new entry button', async () => {
    const renderer = await renderScreen();

    expect(fetchEntriesMock).toHaveBeenCalledWith(
      'id-token',
      { period: { month: 8, year: 2026 }, scope: 'all' },
      1,
    );
    const texts = textsOf(renderer);
    expect(texts.indexOf('Novo lançamento')).toBeLessThan(
      texts.indexOf('Todos'),
    );
    expect(texts).toEqual(
      expect.arrayContaining([
        'Orquiectomia – Mel',
        '17 ago',
        'Honorários',
        'automático',
        'Combustível',
        'Deslocamento',
      ]),
    );
    expect(texts.join(' ').replace(/\u00a0/g, ' ')).toContain('+R$ 620');
    expect(texts.join(' ').replace(/\u00a0/g, ' ')).toContain('–R$ 180');
    const labels = renderer.root
      .findAll(
        node =>
          node.props.accessible === true && !!node.props.accessibilityLabel,
      )
      .map(node =>
        String(node.props.accessibilityLabel).replace(/\u00a0/g, ' '),
      );
    expect(labels).toEqual(
      expect.arrayContaining([
        'Entrada: Orquiectomia – Mel, +R$ 620, 17 ago, Honorários, automático',
        'Saída: Combustível, –R$ 180, 09 ago, Deslocamento',
      ]),
    );
  });

  test('a scope chip reloads the statement with that scope, and an empty answer says so', async () => {
    fetchEntriesMock.mockResolvedValueOnce(ENTRIES).mockResolvedValueOnce([]);
    const renderer = await renderScreen();

    await pressByText(renderer, 'Pessoal');

    expect(fetchEntriesMock).toHaveBeenLastCalledWith(
      'id-token',
      { period: { month: 8, year: 2026 }, scope: 'PERSONAL' },
      1,
    );
    expect(textsOf(renderer)).toContain('Nenhum lançamento pessoal neste mês.');
    expect(textsOf(renderer)).not.toContain('Nenhum lançamento neste mês');
  });

  test('an empty month offers the first entry, and that opens the new entry options', async () => {
    fetchEntriesMock.mockResolvedValue([]);
    const renderer = await renderScreen();

    expect(textsOf(renderer)).toContain('Nenhum lançamento neste mês');

    const emptyState = renderer.root.findByType(EmptyState);
    const emptyAction = emptyState.find(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function' &&
        typeof node.type !== 'string',
    );
    await act(async () => emptyAction.props.onPress());

    expect(textsOf(renderer)).toContain('Lançamento manual');
  });

  test('a failed load can be tried again', async () => {
    fetchEntriesMock
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(ENTRIES);
    const renderer = await renderScreen();

    expect(textsOf(renderer)).toContain(
      'Sem conexão. Tente de novo quando a internet voltar.',
    );

    await pressByText(renderer, 'Tentar novamente');

    expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
    expect(textsOf(renderer)).toContain('Orquiectomia – Mel');
  });

  test('saving a manual entry reloads the statement', async () => {
    const renderer = await renderScreen();
    await act(async () => {
      renderer.root
        .findByProps({ testID: 'finance-new-entry-button' })
        .props.onPress();
    });
    await pressByText(renderer, 'Lançamento manual');
    await typeInto(renderer, 'Descrição', 'Combustível');
    await typeInto(renderer, 'Valor (R$)', '18000');
    await pressByText(renderer, 'Deslocamento');
    await pressByText(renderer, 'Salvar');

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
    expect(textsOf(renderer)).toContain('Lançamento salvo.');
  });

  test('scrolling near the end of the statement loads the next page', async () => {
    fetchEntriesMock
      .mockResolvedValueOnce(
        Array.from({ length: STATEMENT_PAGE_SIZE }, (_, i) =>
          entry({ id: `p1-${i}`, description: `Lançamento ${i}` }),
        ),
      )
      .mockResolvedValueOnce([entry({ id: 'p2-0', description: 'Página 2' })]);
    const renderer = await renderScreen();

    await scrollTo(renderer, 100);
    expect(fetchEntriesMock).toHaveBeenCalledTimes(1);

    await scrollTo(renderer, 2500);

    expect(fetchEntriesMock).toHaveBeenLastCalledWith(
      'id-token',
      { period: { month: 8, year: 2026 }, scope: 'all' },
      2,
    );
    expect(textsOf(renderer)).toContain('Página 2');
    expect(renderer.root.findAllByType(ScrollView).length).toBeGreaterThan(0);
  });
});

describe('entry detail', () => {
  beforeEach(() => {
    updateMock.mockReset();
    deleteMock.mockReset().mockResolvedValue(undefined);
  });

  function openRow(
    renderer: ReactTestRenderer.ReactTestRenderer,
    description: string,
  ) {
    const row = renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        typeof node.type !== 'string' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.includes(description),
    );
    return act(async () => row.props.onPress());
  }

  // Exclusão e aviso aparecem no meio da tela, não subindo de baixo.
  const isDialogOpen = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAll(node => node.props.role === 'alertdialog').length > 0;

  const hasInput = (
    renderer: ReactTestRenderer.ReactTestRenderer,
    label: string,
  ) =>
    renderer.root.findAll(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onChangeText === 'function',
    ).length > 0;

  test('a tap on a manual entry shows it read-only', async () => {
    const renderer = await renderScreen();

    await openRow(renderer, 'Combustível');

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Saída · Lançamento manual',
        '180,00',
        '09/08/2026',
        'Deslocamento',
        'Profissional',
        'Editar',
        'Excluir',
      ]),
    );
    expect(textsOf(renderer)).not.toContain('Automático');
    expect(hasInput(renderer, 'Descrição')).toBe(false);
  });

  test('an edit sends only what changed, shows it and reloads the statement', async () => {
    updateMock.mockImplementation(async (_token, id, changes) => ({
      ...ENTRIES[1],
      id,
      ...changes,
    }));
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');

    await pressByText(renderer, 'Editar');
    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining(['Editar lançamento', 'Cancelar', 'Salvar']),
    );
    await typeInto(renderer, 'Descrição', 'Gasolina');
    await pressByText(renderer, 'Salvar');

    expect(updateMock).toHaveBeenCalledWith('id-token', 'entry-2', {
      description: 'Gasolina',
    });
    expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining(['Gasolina', 'Editar', 'Excluir']),
    );
    expect(textsOf(renderer)).not.toContain('Editar lançamento');
  });

  test('saving an edit without changes goes back without reloading', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');
    await pressByText(renderer, 'Editar');

    await pressByText(renderer, 'Salvar');

    expect(updateMock).not.toHaveBeenCalled();
    expect(fetchEntriesMock).toHaveBeenCalledTimes(1);
    expect(textsOf(renderer)).toContain('Saída · Lançamento manual');
  });

  test('cancelling an edit with changes asks first, and discarding keeps the entry as it was', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');
    await pressByText(renderer, 'Editar');
    await typeInto(renderer, 'Descrição', 'Gasolina');

    await pressByText(renderer, 'Cancelar');
    expect(textsOf(renderer)).toContain('Descartar as alterações?');

    await pressByText(renderer, 'Continuar editando');
    expect(textsOf(renderer)).not.toContain('Descartar as alterações?');

    await pressByText(renderer, 'Cancelar');
    await pressByText(renderer, 'Descartar');

    expect(updateMock).not.toHaveBeenCalled();
    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining(['Saída · Lançamento manual', 'Combustível']),
    );
    expect(textsOf(renderer)).not.toContain('Gasolina');
  });

  test('cancelling an edit without changes goes straight back', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');
    await pressByText(renderer, 'Editar');

    await pressByText(renderer, 'Cancelar');

    expect(textsOf(renderer)).not.toContain('Descartar as alterações?');
    expect(textsOf(renderer)).toContain('Saída · Lançamento manual');
  });

  test('a manual entry is deleted only after the confirmation', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');

    await pressByText(renderer, 'Excluir');
    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Excluir este lançamento?',
        'Ele sai do extrato e essa ação não pode ser desfeita.',
      ]),
    );
    expect(deleteMock).not.toHaveBeenCalled();
    expect(isDialogOpen(renderer)).toBe(true);

    await pressByText(renderer, 'Excluir');

    expect(deleteMock).toHaveBeenCalledWith('id-token', 'entry-2');
    expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
    expect(textsOf(renderer)).not.toContain('Excluir este lançamento?');
    expect(textsOf(renderer)).not.toContain('Saída · Lançamento manual');
  });

  test('a failed delete keeps the entry and says why', async () => {
    deleteMock.mockRejectedValue(new TypeError('Network request failed'));
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');
    await pressByText(renderer, 'Excluir');

    await pressByText(renderer, 'Excluir');

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Excluir este lançamento?',
        'Sem conexão. Tente de novo quando a internet voltar.',
      ]),
    );
    expect(fetchEntriesMock).toHaveBeenCalledTimes(1);
  });

  test('a stale statement that showed an automatic entry as manual just reloads', async () => {
    deleteMock.mockRejectedValue(
      new ApiError('Via origin', 'FINANCIAL_ENTRY_DELETE_VIA_ORIGIN', 409),
    );
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');
    await pressByText(renderer, 'Excluir');

    await pressByText(renderer, 'Excluir');

    expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
    expect(textsOf(renderer)).not.toContain('Excluir este lançamento?');
    expect(textsOf(renderer)).not.toContain('Saída · Lançamento manual');
  });

  test('cancelling the delete goes back to the entry', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Combustível');
    await pressByText(renderer, 'Excluir');

    await pressByText(renderer, 'Cancelar');

    expect(deleteMock).not.toHaveBeenCalled();
    expect(textsOf(renderer)).toContain('Saída · Lançamento manual');
  });

  test('an automatic entry shows what its origin controls', async () => {
    const renderer = await renderScreen();

    await openRow(renderer, 'Orquiectomia – Mel');

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Automático',
        'Entrada · Gerado pelo procedimento',
        'Tipo, valor e data vêm do procedimento. Corrija pela origem.',
        'Abrir procedimento',
      ]),
    );
  });

  test('an automatic entry edits only description, category and scope', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Orquiectomia – Mel');

    await pressByText(renderer, 'Editar');

    expect(hasInput(renderer, 'Descrição')).toBe(true);
    expect(hasInput(renderer, 'Valor (R$)')).toBe(false);
    expect(hasInput(renderer, 'Data')).toBe(false);
    expect(textsOf(renderer)).toContain(
      'Tipo, valor e data vêm do procedimento. Corrija pela origem.',
    );
  });

  test('deleting an automatic entry points to its origin and calls nothing', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Orquiectomia – Mel');

    await pressByText(renderer, 'Excluir');

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Não dá para excluir por aqui',
        'Este lançamento foi gerado pelo procedimento Orquiectomia – Mel. Para excluí-lo, exclua o procedimento — o atendimento também sai do histórico.',
      ]),
    );
    expect(deleteMock).not.toHaveBeenCalled();
    expect(isDialogOpen(renderer)).toBe(true);

    await pressByText(renderer, 'Abrir procedimento');
    expect(textsOf(renderer)).toContain('Atendimento appointment-1');
  });

  test('the procedure opens from the entry, and closing it reloads the statement', async () => {
    const renderer = await renderScreen();
    await openRow(renderer, 'Orquiectomia – Mel');

    await pressByText(renderer, 'Abrir procedimento');
    expect(textsOf(renderer)).toContain('Atendimento appointment-1');

    await pressByText(renderer, 'Atendimento appointment-1');

    expect(textsOf(renderer)).not.toContain('Atendimento appointment-1');
    expect(fetchEntriesMock).toHaveBeenCalledTimes(2);
  });

  test('an origin without a screen in the app cannot be opened', async () => {
    fetchEntriesMock.mockResolvedValue([
      entry({
        id: 'entry-3',
        description: 'Pedido 123',
        source: 'PURCHASE_INVOICE',
        origin: { type: 'PURCHASE_INVOICE', id: 'invoice-1' },
      }),
    ]);
    const renderer = await renderScreen();
    await openRow(renderer, 'Pedido 123');

    expect(textsOf(renderer)).toEqual(
      expect.arrayContaining([
        'Abrir pedido de compra',
        'Essa origem ainda não tem tela no app.',
      ]),
    );
    const open = renderer.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        typeof node.type !== 'string' &&
        node
          .findAllByType('Text' as never)
          .some(t => t.props.children === 'Abrir pedido de compra'),
    );
    expect(open.props.disabled).toBe(true);
  });
});
