import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { StockSyncProvider } from 'features/stock';
import { I18nProvider } from 'shared/i18n';

import { FinanceScreen } from './FinanceScreen';

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

async function renderFinanceScreen() {
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

  return renderer!;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

test('mounts the stock movement history', async () => {
  const renderer = await renderFinanceScreen();

  expect(textsOf(renderer)).toContain('Histórico de movimentações');
});

test('opens the fixed costs screen from the entry row', async () => {
  const renderer = await renderFinanceScreen();

  expect(textsOf(renderer)).toContain('Custos fixos mensais');
  // A tela de custos fixos é um Modal sempre montado (visible=false por
  // padrão), então o próprio título já existe na árvore — a prova real de
  // que abriu é a prop `visible` virar true depois do toque na entrada.
  const entry = renderer.root
    .findAll(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === 'Custos fixos mensais'),
    )!;

  await act(() => {
    entry.props.onPress();
  });

  const modal = renderer.root.findByProps({ animationType: 'slide' });
  expect(modal.props.visible).toBe(true);
});
