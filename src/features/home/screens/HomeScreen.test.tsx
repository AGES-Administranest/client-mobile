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
jest.mock('features/appointments/services/appointmentService', () => ({
  fetchAppointments: jest.fn().mockResolvedValue([]),
}));

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

it('greets the user by first name', async () => {
  const renderer = await renderHome();

  expect(texts(renderer)).toContain('Olá, Dr. Bruna');
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

function press(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityLabel === label,
      )[0]
      .props.onPress();
  });
}

it('opens the month calendar from "Ver mês"', async () => {
  const renderer = await renderHome();

  await press(renderer, 'Ver mês');

  expect(texts(renderer)).toContain('PROCEDIMENTOS DO MÊS OU DIA');
});

it('keeps the week strip and the month calendar on the same day', async () => {
  const renderer = await renderHome();
  const today = new Date();
  // A day of the current month other than today.
  const other = today.getDate() === 1 ? 2 : 1;

  const [stripDay] = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.endsWith(` ${other}`),
  );
  await act(async () => {
    stripDay.props.onPress();
  });
  await press(renderer, 'Ver mês');

  const selected = renderer.root
    .findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityState?.selected === true,
    )
    .map(node => node.props.accessibilityLabel as string);
  expect(selected).toContainEqual(expect.stringMatching(`^${other} de `));
});
