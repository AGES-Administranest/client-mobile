import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { BackendItem } from 'features/materials';
import { fetchItems } from 'features/materials';
import { I18nProvider } from 'shared/i18n';

import { HomeScreen } from './HomeScreen';

const mockSignOut = jest.fn().mockResolvedValue(undefined);
const renderers = new Set<ReactTestRenderer.ReactTestRenderer>();

jest.mock('features/auth/services/authService', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/materials/services/itemService', () => ({
  fetchItems: jest.fn(),
}));

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;

const ITEM_WITHOUT_MINIMUM: BackendItem = {
  id: 'item-without-minimum',
  supplierId: null,
  category: 'DISPOSABLE',
  unit: 'UNIT',
  name: 'Seringa',
  defaultUnitCost: null,
  minimumStock: null,
  currentQuantity: '0.000',
  nearestExpiration: null,
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION = {
  idToken: 'id',
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

async function renderHome() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <HomeScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  renderers.add(renderer);

  return renderer;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

beforeEach(() => {
  mockSignOut.mockClear();
  fetchItemsMock.mockReset();
  fetchItemsMock.mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => {
    renderers.forEach(renderer => renderer.unmount());
    renderers.clear();
  });
});

it('shows the day-to-day tab label', async () => {
  const renderer = await renderHome();

  expect(texts(renderer)).toContain('Dia-Dia');
});

it('signs out from the account menu', async () => {
  const renderer = await renderHome();

  await act(async () => {
    renderer.root
      .findAll(node => node.props.accessibilityLabel === 'Conta')[0]
      .props.onPress();
  });

  await act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          JSON.stringify(
            node.findAllByType('Text' as never).map(t => t.props.children),
          ).includes('Sair da conta'),
      )
      .at(-1)!
      .props.onPress();
  });

  expect(mockSignOut).toHaveBeenCalledWith(SESSION);
});

it('does not invent a low-stock alert when the item has no minimum', async () => {
  fetchItemsMock.mockResolvedValue([ITEM_WITHOUT_MINIMUM]);
  const renderer = await renderHome();

  await act(async () => {
    renderer.root
      .findAll(node => node.props.accessibilityLabel === 'Notificações')[0]
      .props.onPress();
  });

  expect(texts(renderer)).toContain('Nenhum alerta no momento.');
  expect(texts(renderer)).not.toContain('Seringa com estoque baixo');
});

it('shows a load error instead of keeping the notification screen loading', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  fetchItemsMock.mockRejectedValue(new Error('network down'));
  const renderer = await renderHome();

  await act(async () => {
    renderer.root
      .findAll(node => node.props.accessibilityLabel === 'Notificações')[0]
      .props.onPress();
  });

  expect(texts(renderer)).toContain('Não foi possível carregar os alertas.');
  expect(texts(renderer)).not.toContain('Carregando estoque...');
  warning.mockRestore();
});
