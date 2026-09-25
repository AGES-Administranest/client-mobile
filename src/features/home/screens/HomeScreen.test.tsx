import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { HomeScreen } from './HomeScreen';

const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockFetchAppointments = jest.fn();

jest.mock('features/auth/services/authService', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/procedures/services/procedureService', () => ({
  fetchAppointments: (...args: unknown[]) => mockFetchAppointments(...args),
  createAppointment: jest.fn(),
  updateAppointment: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn().mockResolvedValue([]),
  createClient: jest.fn(),
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
  // O VirtualizedList da lista do Dia a Dia renderiza em lotes, por timer.
  await act(async () => {
    jest.runOnlyPendingTimers();
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

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.useFakeTimers();
  mockSignOut.mockClear();
  mockFetchAppointments.mockReset();
  mockFetchAppointments.mockResolvedValue([]);
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

it('renders the appointment history inside the day tab', async () => {
  mockFetchAppointments.mockResolvedValue([
    {
      id: 'appointment-1',
      procedureName: 'Orquiectomia',
      patientName: 'Rex',
      clientId: null,
      location: 'Clínica Antiga',
      startsAt: new Date(2026, 7, 6, 9, 0).toISOString(),
      amount: '350.00',
    },
  ]);

  const renderer = await renderHome();

  expect(mockFetchAppointments).toHaveBeenCalledWith(
    'id',
    expect.objectContaining({ status: 'COMPLETED', page: 1, pageSize: 20 }),
  );
  expect(texts(renderer)).toContain('Orquiectomia');
});

it('opens the new procedure form from the button owned by the day screen', async () => {
  const renderer = await renderHome();
  expect(texts(renderer)).not.toContain('Confirmar');

  await act(async () => {
    renderer.root
      .findAll(
        node =>
          node.props.accessibilityLabel === 'Novo atendimento' &&
          typeof node.props.onPress === 'function',
      )[0]
      .props.onPress();
  });

  expect(texts(renderer)).toContain('Confirmar');
});
