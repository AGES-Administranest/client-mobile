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

  const textsOf = () =>
    renderer!.root
      .findAllByType('Text' as never)
      .map(node => node.props.children);

  expect(textsOf()).toContain('Finanças');
  expect(textsOf()).not.toContain('Calculadora de hora');

  const open = renderer!.root.find(
    node =>
      node.props.accessibilityLabel === 'Abrir calculadora de hora' &&
      typeof node.props.onPress === 'function',
  );

  await act(async () => open.props.onPress());

  expect(textsOf()).toContain('Calculadora de hora');

  const back = renderer!.root.find(
    node =>
      node.props.accessibilityLabel === 'Voltar' &&
      typeof node.props.onPress === 'function',
  );

  await act(async () => back.props.onPress());

  expect(textsOf()).not.toContain('Calculadora de hora');
});
