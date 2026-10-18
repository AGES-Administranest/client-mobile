import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { StockMovement } from 'features/stock/domain/stockMovement';
import {
  StockSyncProvider,
  useStockSyncState,
} from 'features/stock/hooks/StockSyncContext';
import { MovementHistoryScreen } from 'features/stock/screens/MovementHistoryScreen';
import {
  addPendingMovement,
  loadPendingMovements,
} from 'features/stock/services/pendingMovementsRepository';
import { fetchStockMovements } from 'features/stock/services/stockMovementService';
import {
  pullStockMovements,
  pushPendingMovements,
} from 'features/stock/services/stockSyncService';
import { I18nProvider } from 'shared/i18n';
import { toCalendarDate } from 'shared/utils/calendar';

const mockConnectionListeners = new Set<() => void>();

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('shared/services', () => ({
  onConnectionRestored: jest.fn((listener: () => void) => {
    mockConnectionListeners.add(listener);
    return () => mockConnectionListeners.delete(listener);
  }),
}));

jest.mock('features/stock/services/stockMovementService', () => ({
  fetchStockMovements: jest.fn(),
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

const fetchMock = fetchStockMovements as jest.MockedFunction<
  typeof fetchStockMovements
>;
const pullMock = pullStockMovements as jest.MockedFunction<
  typeof pullStockMovements
>;

const ID_TOKEN = 'id-token';

const SESSION = {
  idToken: ID_TOKEN,
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const USER = 'user-1';

const ACCOUNT: Account = {
  id: USER,
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const SEARCH_DEBOUNCE_MS = 20;
const AFTER_DEBOUNCE_MS = 60;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function respondFilteringLikeTheBackend(movements: StockMovement[]) {
  fetchMock.mockImplementation(async (_idToken, filters = {}) => {
    let result = movements;

    if (filters.search) {
      const term = normalize(filters.search);
      result = result.filter(movement =>
        normalize(movement.itemName).includes(term),
      );
    }

    if (filters.periodStart) {
      const from = filters.periodStart;
      result = result.filter(
        movement => toCalendarDate(movement.occurredAt) >= from,
      );
    }

    if (filters.periodEnd) {
      const to = filters.periodEnd;
      result = result.filter(
        movement => toCalendarDate(movement.occurredAt) <= to,
      );
    }

    return result;
  });
}

const APPOINTMENT_OUTBOUND: StockMovement = {
  id: 'movement-1',
  itemId: 'item-1',
  itemName: 'Propofol 10mg/ml 20ml',
  unit: 'ampoule',
  type: 'outbound',
  source: 'appointment',
  quantity: 2,
  unitCost: 19.9,
  occurredAt: '2026-08-12T09:30:00',
  appointment: { id: 'appointment-1', label: 'Orquiectomia — Mel' },
};

const PURCHASE_INBOUND: StockMovement = {
  id: 'movement-2',
  itemId: 'item-2',
  itemName: 'Seringa 60ml (cx 30un)',
  unit: 'box',
  type: 'inbound',
  source: 'manualPurchase',
  quantity: 1,
  unitCost: 145,
  occurredAt: '2026-09-05T14:00:00',
};

const EXPIRATION_ADJUSTMENT: StockMovement = {
  id: 'movement-3',
  itemId: 'item-3',
  itemName: 'Soro fisiológico 500ml',
  unit: 'unit',
  type: 'outbound',
  source: 'manualAdjustment',
  adjustmentReason: 'expiration',
  quantity: 3,
  unitCost: 8.9,
  occurredAt: '2026-08-29T17:20:00',
};

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

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

// The fixtures live in September 2026 and the calendar opens on the current
// month, so the date is pinned; only Date is faked, timers stay real.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 15, 12),
    doNotFake: [...REAL_TIMERS],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

afterEach(() => {
  while (mounted.length > 0) {
    const renderer = mounted.pop();
    act(() => {
      renderer?.unmount();
    });
  }
});

async function mount(
  props: { embedded?: boolean } = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <StockSyncProvider>
            <MovementHistoryScreen
              searchDebounceMs={SEARCH_DEBOUNCE_MS}
              {...props}
            />
          </StockSyncProvider>
        </AuthProvider>
      </I18nProvider>,
    );
  });

  mounted.push(renderer!);

  return renderer!;
}

function readTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  ).replace(/\u00a0/g, ' ');
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), ms);
    });
  });
}

async function renderScreen() {
  return readTexts(await mount());
}

function searchInput(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Buscar por item' &&
      typeof node.props.onChangeText === 'function',
  );
}

function periodToggle(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityState?.expanded !== undefined &&
      typeof node.props.onPress === 'function',
  );
}

function dayCell(renderer: ReactTestRenderer.ReactTestRenderer, date: string) {
  return renderer.root.find(
    node =>
      node.props.testID === date && typeof node.props.onPress === 'function',
  );
}

function isCalendarOpen(renderer: ReactTestRenderer.ReactTestRenderer) {
  return (
    renderer.root.findAll(
      node =>
        typeof node.props.testID === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(node.props.testID),
    ).length > 0
  );
}

async function pickSingleDay(
  renderer: ReactTestRenderer.ReactTestRenderer,
  date: string,
) {
  await act(async () => {
    periodToggle(renderer).props.onPress();
  });

  await act(async () => {
    dayCell(renderer, date).props.onPress();
  });

  await act(async () => {
    dayCell(renderer, date).props.onPress();
  });
}

beforeEach(async () => {
  fetchMock.mockReset();
  mockConnectionListeners.clear();
  await AsyncStorage.clear();
});

test('lists inbounds, appointment outbounds and manual adjustments with date, value, quantity and origin', async () => {
  fetchMock.mockResolvedValue([
    APPOINTMENT_OUTBOUND,
    PURCHASE_INBOUND,
    EXPIRATION_ADJUSTMENT,
  ]);

  const texts = await renderScreen();

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('12 ago');
  expect(texts).toContain('Saída por atendimento');
  expect(texts).toContain('-R$ 39,80');
  expect(texts).toContain('2 ampolas');

  expect(texts).toContain('Seringa 60ml (cx 30un)');
  expect(texts).toContain('05 set');
  expect(texts).toContain('Compra manual');
  expect(texts).toContain('+R$ 145,00');
  expect(texts).toContain('1 caixa');

  expect(texts).toContain('Soro fisiológico 500ml');
  expect(texts).toContain('29 ago');
  expect(texts).toContain('Ajuste · Vencimento');
  expect(texts).toContain('-R$ 26,70');
  expect(texts).toContain('3 un');
});

test('scrolls by itself as a screen, but leaves the scrolling to the page it sits in', async () => {
  const standalone = await mount();
  expect(standalone.root.findByType(ScrollView).props.scrollEnabled).toBe(true);

  const embedded = await mount({ embedded: true });
  expect(embedded.root.findByType(ScrollView).props.scrollEnabled).toBe(false);
});

test('shows the appointment link only on movements that came from an appointment', async () => {
  fetchMock.mockResolvedValue([APPOINTMENT_OUTBOUND, PURCHASE_INBOUND]);

  const texts = await renderScreen();

  expect(texts).toContain('Atendimento · Orquiectomia — Mel');
  expect(texts.match(/Atendimento · /g)).toHaveLength(1);
});

test('orders the history from the most recent movement', async () => {
  fetchMock.mockResolvedValue([
    APPOINTMENT_OUTBOUND,
    PURCHASE_INBOUND,
    EXPIRATION_ADJUSTMENT,
  ]);

  const texts = await renderScreen();

  expect(texts.indexOf('Seringa')).toBeLessThan(texts.indexOf('Soro'));
  expect(texts.indexOf('Soro')).toBeLessThan(texts.indexOf('Propofol'));
});

test('shows the empty message when there is no movement yet', async () => {
  fetchMock.mockResolvedValue([]);

  const texts = await renderScreen();

  expect(texts).toContain('Nenhuma movimentação registrada.');
});

test('offers a retry when the history fails to load, and recovers on success', async () => {
  fetchMock.mockRejectedValueOnce(new Error('network down'));

  const renderer = await mount();

  expect(readTexts(renderer)).toContain(
    'Não foi possível carregar o histórico.',
  );

  fetchMock.mockResolvedValueOnce([PURCHASE_INBOUND]);

  const retryButton = renderer.root
    .findAll(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === 'Tentar novamente'),
    )!;

  await act(async () => {
    retryButton.props.onPress();
  });

  const texts = readTexts(renderer);

  expect(texts).toContain('Seringa 60ml (cx 30un)');
  expect(texts).not.toContain('Não foi possível carregar o histórico.');
});

test('does not show locally queued movements when the history is offline', async () => {
  await addPendingMovement(USER, {
    id: 'offline-movement',
    itemId: 'item-offline',
    itemName: 'Item cadastrado offline',
    unit: 'unit',
    type: 'inbound',
    source: 'manualPurchase',
    quantity: 1,
    unitCost: 10,
    occurredAt: '2026-09-10T08:00:00.000Z',
    notes: null,
  });
  fetchMock.mockRejectedValue(new Error('network down'));

  const texts = await renderScreen();

  expect(texts).not.toContain('Item cadastrado offline');
  expect(texts).toContain('Não foi possível carregar o histórico.');
  expect(await loadPendingMovements(USER)).toHaveLength(1);
});

test('refreshes the history after the connection is restored', async () => {
  fetchMock
    .mockRejectedValueOnce(new Error('network down'))
    .mockResolvedValueOnce([PURCHASE_INBOUND]);

  const renderer = await mount();

  await act(async () => {
    mockConnectionListeners.forEach(listener => listener());
  });
  await wait(50);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(readTexts(renderer)).toContain('Seringa 60ml (cx 30un)');
  expect(readTexts(renderer)).not.toContain(
    'Não foi possível carregar o histórico.',
  );
});

test('refreshes the history once a stock sync brings changes', async () => {
  pullMock.mockResolvedValueOnce({
    movements: [PURCHASE_INBOUND],
    balances: [],
    cursor: 'cursor-2',
    hasMore: false,
    afterId: null,
  });
  fetchMock.mockResolvedValueOnce([]).mockResolvedValue([PURCHASE_INBOUND]);

  const renderer = await mount();
  await wait(50);

  expect(readTexts(renderer)).toContain('Seringa 60ml (cx 30un)');
});

test('refreshes the history when a movement is left waiting in the queue', async () => {
  const pushMock = pushPendingMovements as jest.MockedFunction<
    typeof pushPendingMovements
  >;
  let syncNow: () => Promise<void> = async () => {};
  function SyncTrigger() {
    syncNow = useStockSyncState().sync;
    return null;
  }
  fetchMock.mockResolvedValue([]);
  await act(async () => {
    mounted.push(
      ReactTestRenderer.create(
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <StockSyncProvider>
              <MovementHistoryScreen searchDebounceMs={SEARCH_DEBOUNCE_MS} />
              <SyncTrigger />
            </StockSyncProvider>
          </AuthProvider>
        </I18nProvider>,
      ),
    );
  });
  await wait(50);
  const callsBefore = fetchMock.mock.calls.length;

  await addPendingMovement(USER, {
    id: 'queued-write-off',
    itemId: 'item-1',
    itemName: 'Dipirona',
    unit: 'unit',
    type: 'outbound',
    source: 'manualAdjustment',
    quantity: 2,
    unitCost: 5,
    occurredAt: '2026-09-10T08:00:00.000Z',
    notes: null,
  });
  pushMock.mockRejectedValueOnce(new Error('network down'));
  await act(async () => {
    await syncNow();
  });
  await wait(50);

  expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
});

describe('filters', () => {
  beforeEach(() => {
    respondFilteringLikeTheBackend([
      APPOINTMENT_OUTBOUND,
      PURCHASE_INBOUND,
      EXPIRATION_ADJUSTMENT,
    ]);
  });

  async function search(
    renderer: ReactTestRenderer.ReactTestRenderer,
    term: string,
  ) {
    await act(async () => {
      searchInput(renderer).props.onChangeText(term);
    });

    await wait(AFTER_DEBOUNCE_MS);
  }

  it('filters by item name as the user types', async () => {
    const renderer = await mount();

    await search(renderer, 'seringa');

    const texts = readTexts(renderer);

    expect(texts).toContain('Seringa 60ml (cx 30un)');
    expect(texts).not.toContain('Propofol');
    expect(texts).not.toContain('Soro');
  });

  it('hands the term to the backend as typed, accents included', async () => {
    const renderer = await mount();

    await search(renderer, 'FISIOLÓGICO');

    expect(fetchMock).toHaveBeenLastCalledWith(
      ID_TOKEN,
      expect.objectContaining({ search: 'FISIOLÓGICO' }),
    );

    const texts = readTexts(renderer);

    expect(texts).toContain('Soro fisiológico 500ml');
    expect(texts).not.toContain('Propofol');
  });

  it('does not query on a term shorter than the backend accepts', async () => {
    const renderer = await mount();

    await search(renderer, 's');

    expect(fetchMock).toHaveBeenLastCalledWith(ID_TOKEN, {});
    expect(readTexts(renderer)).toContain('Propofol 10mg/ml 20ml');
  });

  it('returns only that day when the same day is picked as start and end', async () => {
    const renderer = await mount();

    await pickSingleDay(renderer, '2026-09-05');

    const texts = readTexts(renderer);

    expect(texts).toContain('Seringa 60ml (cx 30un)');
    expect(texts).not.toContain('Propofol');
    expect(texts).not.toContain('Soro');
  });

  it('returns every movement inside a multi-day period', async () => {
    const renderer = await mount();

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    await act(async () => {
      renderer.root
        .find(
          node =>
            node.props.accessibilityLabel === 'Mês anterior' &&
            typeof node.props.onPress === 'function',
        )
        .props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-08-12').props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-08-29').props.onPress();
    });

    const texts = readTexts(renderer);

    expect(texts).toContain('Propofol 10mg/ml 20ml');
    expect(texts).toContain('Soro fisiológico 500ml');
    expect(texts).not.toContain('Seringa');
  });

  it('combines the item and the period filters', async () => {
    const renderer = await mount();

    await search(renderer, 'propofol');

    await pickSingleDay(renderer, '2026-09-05');

    expect(readTexts(renderer)).toContain(
      'Nenhuma movimentação encontrada para o filtro.',
    );
  });

  it('tells the user nothing matched, not that there is no history', async () => {
    const renderer = await mount();

    await search(renderer, 'cetamina');

    const texts = readTexts(renderer);

    expect(texts).toContain('Nenhuma movimentação encontrada para o filtro.');
    expect(texts).not.toContain('Nenhuma movimentação registrada.');
  });

  it('restores the full history when the filters are cleared', async () => {
    const renderer = await mount();

    await search(renderer, 'seringa');

    expect(readTexts(renderer)).not.toContain('Propofol');

    await act(async () => {
      renderer.root
        .find(
          node =>
            node.props.accessibilityLabel === 'Limpar' &&
            typeof node.props.onPress === 'function',
        )
        .props.onPress();
    });

    await wait(AFTER_DEBOUNCE_MS);

    const texts = readTexts(renderer);

    expect(texts).toContain('Propofol 10mg/ml 20ml');
    expect(texts).toContain('Seringa 60ml (cx 30un)');
    expect(texts).toContain('Soro fisiológico 500ml');
  });

  it('shows the picked period on the filter button', async () => {
    const renderer = await mount();

    expect(readTexts(renderer)).toContain('Período');

    await pickSingleDay(renderer, '2026-09-05');

    expect(readTexts(renderer)).toContain('05 set');
  });
});

describe('calendar visibility', () => {
  beforeEach(() => {
    respondFilteringLikeTheBackend([
      APPOINTMENT_OUTBOUND,
      PURCHASE_INBOUND,
      EXPIRATION_ADJUSTMENT,
    ]);
  });

  it('stays open while only the start of the period is picked', async () => {
    const renderer = await mount();

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(true);

    await act(async () => {
      dayCell(renderer, '2026-09-05').props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(true);
  });

  it('closes once start and end are both picked', async () => {
    const renderer = await mount();

    await pickSingleDay(renderer, '2026-09-05');

    expect(isCalendarOpen(renderer)).toBe(false);
    expect(readTexts(renderer)).toContain('05 set');
  });

  it('closes on a multi-day period too', async () => {
    const renderer = await mount();

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-09-01').props.onPress();
    });

    await act(async () => {
      dayCell(renderer, '2026-09-10').props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(false);
  });

  it('can be reopened to pick a different period', async () => {
    const renderer = await mount();

    await pickSingleDay(renderer, '2026-09-05');

    await act(async () => {
      periodToggle(renderer).props.onPress();
    });

    expect(isCalendarOpen(renderer)).toBe(true);
  });
});
