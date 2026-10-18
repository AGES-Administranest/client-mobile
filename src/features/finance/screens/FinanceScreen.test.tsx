import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { EmptyState } from 'app/components/ui/empty-state';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { StockSyncProvider } from 'features/stock';
import { I18nProvider } from 'shared/i18n';

import { FinanceScreen } from './FinanceScreen';
import type { FinancialEntry } from '../domain/financialEntry';
import { STATEMENT_PAGE_SIZE } from '../domain/statement';
import { fetchAdjustableItems } from 'features/stock/services/stockAdjustmentService';
import {
  createFinancialEntry,
  fetchFinancialCategories,
  fetchFinancialEntries,
} from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  createFinancialEntry: jest.fn(),
  fetchFinancialCategories: jest.fn(),
  fetchFinancialEntries: jest.fn(),
}));
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

jest.mock('features/stock/services/stockAdjustmentService', () => {
  const actual = jest.requireActual(
    'features/stock/services/stockAdjustmentService',
  );

  return {
    ...actual,
    fetchAdjustableItems: jest.fn(() => Promise.resolve([])),
  };
});

const createMock = createFinancialEntry as jest.MockedFunction<
  typeof createFinancialEntry
>;
const fetchCategoriesMock = fetchFinancialCategories as jest.MockedFunction<
  typeof fetchFinancialCategories
>;
const fetchEntriesMock = fetchFinancialEntries as jest.MockedFunction<
  typeof fetchFinancialEntries
>;
const mockFetchAdjustableItems = fetchAdjustableItems as jest.MockedFunction<
  typeof fetchAdjustableItems
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
// o nativo não tem onPress.
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
  mockFetchAdjustableItems.mockClear();
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
  expect(mockFetchAdjustableItems).not.toHaveBeenCalled();
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
