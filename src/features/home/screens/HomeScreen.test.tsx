import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { InventoryProvider } from 'features/inventory';
import { I18nProvider } from 'shared/i18n';

import { HomeScreen } from './HomeScreen';

const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock('features/auth/services/authService', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
const mockFetchAppointments = jest.fn();

jest.mock('features/appointments/services/appointmentService', () => ({
  fetchAppointments: (...args: unknown[]) => mockFetchAppointments(...args),
}));

// Mocka o serviço, não o barrel: `requireActual('features/materials')` entra
// num ciclo (materials → stockEntry → materials) e lê o barrel pela metade.
jest.mock('features/materials/services/itemService', () => ({
  ...jest.requireActual('features/materials/services/itemService'),
  fetchItems: jest.fn(async () => []),
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
            <InventoryProvider>
              <HomeScreen />
            </InventoryProvider>
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

beforeEach(() => {
  mockSignOut.mockClear();
  mockFetchAppointments.mockReset();
  mockFetchAppointments.mockResolvedValue([]);
});

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

function monthGridDays(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    node =>
      typeof node.props.testID === 'string' &&
      node.props.testID.startsWith('calendar-day-') &&
      typeof node.props.onPress === 'function',
  );
}

it('expands the month in place with "Ver mês" and folds it back', async () => {
  const renderer = await renderHome();
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).getDate();

  expect(monthGridDays(renderer)).toHaveLength(0);

  await press(renderer, 'Ver mês');

  expect(monthGridDays(renderer)).toHaveLength(daysInMonth);
  expect(texts(renderer)).not.toContain('PROCEDIMENTOS DO MÊS OU DIA');

  await press(renderer, 'Ver semana');

  expect(monthGridDays(renderer)).toHaveLength(0);
});

it('moves between months while expanded', async () => {
  const renderer = await renderHome();
  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');

  await press(renderer, 'Ver mês');
  await press(renderer, 'Próximo mês');

  expect(
    renderer.root.findAll(
      node =>
        node.props.testID ===
        `calendar-day-${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`,
    ).length,
  ).toBeGreaterThan(0);
});

it('opens the month with no day picked', async () => {
  const renderer = await renderHome();

  await press(renderer, 'Ver mês');

  expect(
    monthGridDays(renderer).filter(
      node => node.props.accessibilityState?.selected === true,
    ),
  ).toHaveLength(0);
});

it('lists the whole month while expanded, and the day otherwise', async () => {
  const today = new Date();
  const other = new Date(today);
  other.setDate(today.getDate() === 1 ? 2 : 1);
  const at = (date: Date) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      10,
    ).toISOString();
  mockFetchAppointments.mockImplementation(
    async (_token: string, { status }: { status: string }) =>
      status === 'SCHEDULED'
        ? [
            {
              id: 'today',
              patientName: 'Mel',
              startsAt: at(today),
              status: 'SCHEDULED',
            },
            {
              id: 'other',
              patientName: 'Thor',
              startsAt: at(other),
              status: 'SCHEDULED',
            },
          ]
        : [],
  );
  const renderer = await renderHome();

  expect(texts(renderer)).toContain('Mel');
  expect(texts(renderer)).not.toContain('Thor');

  await press(renderer, 'Ver mês');

  expect(texts(renderer)).toContain('Mel');
  expect(texts(renderer)).toContain('Thor');

  // Picking a day narrows the agenda to it; picking it again widens it back.
  const pad = (n: number) => String(n).padStart(2, '0');
  const otherDay = `calendar-day-${other.getFullYear()}-${pad(
    other.getMonth() + 1,
  )}-${pad(other.getDate())}`;
  const pick = () =>
    act(async () => {
      renderer.root
        .findAll(
          node =>
            node.props.testID === otherDay &&
            typeof node.props.onPress === 'function',
        )[0]
        .props.onPress();
    });

  await pick();
  expect(texts(renderer)).toContain('Thor');
  expect(texts(renderer)).not.toContain('Mel');

  await pick();
  expect(texts(renderer)).toContain('Mel');
  expect(texts(renderer)).toContain('Thor');
});
