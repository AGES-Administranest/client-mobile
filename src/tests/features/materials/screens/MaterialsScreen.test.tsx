<<<<<<< HEAD
import ReactTestRenderer, { act } from 'react-test-renderer';

import { MaterialsScreen } from 'features/materials';
import { I18nProvider } from 'shared/i18n';

=======
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { MaterialsScreen } from 'features/materials';
import { fetchItems } from 'features/materials/services/itemService';
import { I18nProvider } from 'shared/i18n';

// A tela carrega o estoque no mount; sem isto o teste bate na rede real e
// cai no estado de erro em vez do estado vazio que ele descreve.
jest.mock('features/materials/services/itemService', () => ({
  fetchItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
}));

// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

// The stock-entry sheets on this page read the safe-area insets.
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

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;

beforeEach(() => {
  fetchItemsMock.mockReset();
  fetchItemsMock.mockResolvedValue([]);
});

>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
async function renderScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
<<<<<<< HEAD
      <I18nProvider>
        <MaterialsScreen />
      </I18nProvider>,
=======
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <MaterialsScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
    );
  });

  return renderer!;
}

function getTexts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat()
    .join(' | ');
}

<<<<<<< HEAD
=======
// A pill is the only button here that reports whether it is selected — the
// page's action buttons (add, stock entry) are plain buttons.
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
function getCategoryPills(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
<<<<<<< HEAD
=======
      node.props.accessibilityState?.selected !== undefined &&
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
      typeof node.props.onPress === 'function',
  );
}

function getSegmentTabs(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );
}

test('defaults to the supplies segment with only the "Todos" category and an empty list', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  expect(segmentTabs[0].props.accessibilityState).toEqual({ selected: true });

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills).toHaveLength(1);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });

  expect(getTexts(renderer)).toContain('Nenhum item encontrado');
});

test('switching segment keeps the empty state', async () => {
  const renderer = await renderScreen();

  const segmentTabs = getSegmentTabs(renderer);
  await act(async () => {
    segmentTabs[1].props.onPress();
  });

  const categoryPills = getCategoryPills(renderer);
  expect(categoryPills).toHaveLength(1);
  expect(categoryPills[0].props.accessibilityState).toEqual({
    selected: true,
  });

  expect(getTexts(renderer)).toContain('Nenhum item encontrado');
});
<<<<<<< HEAD
=======

test('a rejected session shows the session message instead of an empty list', async () => {
  const { ApiError } = jest.requireActual<
    typeof import('shared/services/apiClient')
  >('shared/services/apiClient');
  fetchItemsMock.mockRejectedValue(
    new ApiError('Token expired', 'TOKEN_EXPIRED', 401),
  );

  const renderer = await renderScreen();

  expect(getTexts(renderer)).toContain('Sua sessão expirou');
  expect(getTexts(renderer)).not.toContain('Nenhum item encontrado');
});
>>>>>>> 26292fa88c7840646634c148984de0ef18123c8a
