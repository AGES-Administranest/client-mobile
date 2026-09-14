import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { HomeScreen } from './HomeScreen';

const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock('features/auth/services/authService', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

  return renderer;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

beforeEach(() => mockSignOut.mockClear());

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
