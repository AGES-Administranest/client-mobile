import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { StockSyncProvider } from 'features/stock/hooks/StockSyncContext';
import { OutputAdjustmentSheet } from 'features/stock/screens/OutputAdjustmentSheet';
import { loadPendingMovements } from 'features/stock/services/pendingMovementsRepository';
import { pushPendingMovements } from 'features/stock/services/stockSyncService';
import { I18nProvider } from 'shared/i18n';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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
    fetchAdjustableItems: jest.fn(() =>
      Promise.resolve([
        {
          id: 'item-1',
          name: 'Propofol 10mg/ml 20ml',
          unit: 'ampoule',
          availableQuantity: 8,
          unitCost: 10,
        },
      ]),
    ),
  };
});

const pushMock = pushPendingMovements as jest.MockedFunction<
  typeof pushPendingMovements
>;

const SESSION = {
  idToken: 'id-token',
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

const QUEUE_WRITE_FAILED =
  'Não foi possível salvar o ajuste neste aparelho. Tente de novo.';

const onClose = jest.fn();
const onSaved = jest.fn();

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function sheetWith(visible: boolean) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <I18nProvider>
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <StockSyncProvider>
            <OutputAdjustmentSheet
              visible={visible}
              onClose={onClose}
              onSaved={onSaved}
            />
          </StockSyncProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

async function mountOpen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(sheetWith(true));
  });

  mounted.push(renderer!);

  return renderer!;
}

function readTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  return renderer.root
    .findAll(
      node =>
        (node.props.role === 'button' ||
          node.props.accessibilityRole === 'button') &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === text),
    )!;
}

function byLabel(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      (typeof node.props.onPress === 'function' ||
        typeof node.props.onChangeText === 'function'),
  );
}

async function fillValidAdjustment(
  renderer: ReactTestRenderer.ReactTestRenderer,
) {
  await act(async () => {
    byLabel(renderer, 'Item').props.onPress();
  });

  await act(async () => {
    renderer.root
      .find(node => node.props.testID === 'item-option-item-1')
      .props.onPress();
  });

  await act(async () => {
    byLabel(renderer, 'Quantidade').props.onChangeText('2');
  });

  await act(async () => {
    byLabel(renderer, 'Perda').props.onPress();
  });
}

async function save(renderer: ReactTestRenderer.ReactTestRenderer) {
  await act(async () => {
    pressableWithText(renderer, 'Salvar').props.onPress();
  });
}

beforeEach(async () => {
  onClose.mockReset();
  onSaved.mockReset();
  pushMock.mockClear();
  await AsyncStorage.clear();
});

afterEach(() => {
  while (mounted.length > 0) {
    const renderer = mounted.pop();
    act(() => {
      renderer?.unmount();
    });
  }
});

test('queues the write-off, reports it saved and syncs the stock', async () => {
  const renderer = await mountOpen();

  await fillValidAdjustment(renderer);
  await save(renderer);

  expect(await loadPendingMovements(USER)).toEqual([
    expect.objectContaining({
      itemId: 'item-1',
      quantity: 2,
      adjustmentReason: 'loss',
      notes: null,
    }),
  ]);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(pushMock).toHaveBeenCalledWith('id-token', [
    expect.objectContaining({ itemId: 'item-1', quantity: 2 }),
  ]);
});

test('reports what went wrong, out loud too, and keeps the form open on failure', async () => {
  const announce = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  const renderer = await mountOpen();

  await fillValidAdjustment(renderer);

  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
    new Error('disk full'),
  );

  await save(renderer);

  expect(readTexts(renderer)).toContain(QUEUE_WRITE_FAILED);
  expect(announce).toHaveBeenCalledWith(QUEUE_WRITE_FAILED);
  announce.mockRestore();
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();

  const modal = renderer.root.findAll(
    node => node.props.visible !== undefined && node.props.transparent,
  );

  expect(modal.some(node => node.props.visible === true)).toBe(true);
});

test('starts empty every time it opens', async () => {
  const renderer = await mountOpen();

  await fillValidAdjustment(renderer);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
    new Error('disk full'),
  );
  await save(renderer);

  await act(async () => {
    renderer.update(sheetWith(false));
  });
  await act(async () => {
    renderer.update(sheetWith(true));
  });

  expect(byLabel(renderer, 'Quantidade').props.value).toBe('');
  expect(readTexts(renderer)).toContain('Selecione o item');
  expect(readTexts(renderer)).not.toContain(QUEUE_WRITE_FAILED);
});

test('loads the items once per opening, so an item added meanwhile shows up', async () => {
  const fetchItems = jest.requireMock(
    'features/stock/services/stockAdjustmentService',
  ).fetchAdjustableItems as jest.Mock;
  fetchItems.mockClear();
  const renderer = await mountOpen();
  expect(fetchItems).toHaveBeenCalledTimes(1);

  fetchItems.mockResolvedValueOnce([
    {
      id: 'item-1',
      name: 'Propofol 10mg/ml 20ml',
      unit: 'ampoule',
      availableQuantity: 8,
      unitCost: 10,
    },
    {
      id: 'item-2',
      name: 'Dipirona 500mg/ml',
      unit: 'ampoule',
      availableQuantity: 3,
      unitCost: 2,
    },
  ]);
  await act(async () => {
    renderer.update(sheetWith(false));
  });
  await act(async () => {
    renderer.update(sheetWith(true));
  });
  await act(async () => {
    byLabel(renderer, 'Item').props.onPress();
  });

  expect(fetchItems).toHaveBeenCalledTimes(2);
  expect(readTexts(renderer)).toContain('Dipirona 500mg/ml');
});

test('keeps the items it already has when loading them again fails', async () => {
  const fetchItems = jest.requireMock(
    'features/stock/services/stockAdjustmentService',
  ).fetchAdjustableItems as jest.Mock;
  const renderer = await mountOpen();

  fetchItems.mockRejectedValueOnce(new Error('fetch failed: offline'));
  await act(async () => {
    renderer.update(sheetWith(false));
  });
  await act(async () => {
    renderer.update(sheetWith(true));
  });

  await fillValidAdjustment(renderer);
  await save(renderer);

  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(await loadPendingMovements(USER)).toEqual([
    expect.objectContaining({ itemId: 'item-1', quantity: 2 }),
  ]);
});

test('lists each item with how much of it is in stock', async () => {
  const renderer = await mountOpen();

  await act(async () => {
    byLabel(renderer, 'Item').props.onPress();
  });

  expect(readTexts(renderer)).toContain('Propofol 10mg/ml 20ml');
  expect(readTexts(renderer)).toContain('8 ampolas');
});

test('asks its owner to close it from the close button', async () => {
  const renderer = await mountOpen();

  await act(async () => {
    byLabel(renderer, 'Fechar').props.onPress();
  });

  expect(onClose).toHaveBeenCalledTimes(1);
});
