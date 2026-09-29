import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AccountInventoryAlerts } from 'app/App';
import {
  AuthProvider,
  TERMS_VERSION,
  useAuth,
  type Account,
} from 'features/auth';
import { InventoryAlertObserver, InventoryProvider } from 'features/inventory';
import { fetchItems } from 'features/materials';
import { I18nProvider } from 'shared/i18n';
import { scheduleNotification } from 'shared/services';

const mockDeactivate = jest.fn(async (_userId: string) => undefined);

jest.mock('features/auth/services/authService', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/inventory/services/deactivateInventoryAlerts', () => ({
  deactivateInventoryAlerts: (userId: string) => mockDeactivate(userId),
}));

jest.mock('features/materials', () => ({
  ...jest.requireActual('features/materials'),
  fetchItems: jest.fn(),
}));

jest.mock('shared/services', () => ({
  onConnectionRestored: jest.fn(() => () => undefined),
  initNotifications: jest.fn(async () => undefined),
  scheduleNotification: jest.fn(async () => 'notification-1'),
  scheduleNotificationAt: jest.fn(async () => 'notification-2'),
  cancelNotification: jest.fn(async () => undefined),
  requestNotificationPermission: jest.fn(async () => true),
}));

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;
const scheduleMock = scheduleNotification as jest.MockedFunction<
  typeof scheduleNotification
>;

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

function backendItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    supplierId: null,
    category: 'MEDICATION',
    unit: 'AMPOULE',
    name: 'Dipirona 500mg',
    defaultUnitCost: '12.50',
    minimumStock: '10',
    currentQuantity: '2',
    nearestExpiration: null,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

afterEach(() => {
  while (mounted.length > 0) {
    const renderer = mounted.pop();
    act(() => {
      renderer?.unmount();
    });
  }
});

let signOut: () => Promise<void>;

function CaptureSignOut() {
  signOut = useAuth().signOut;
  return null;
}

async function renderAlerts(account: Account | null) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider
          initialSession={account ? SESSION : null}
          initialAccount={account}
        >
          <InventoryProvider>
            <CaptureSignOut />
            <AccountInventoryAlerts />
          </InventoryProvider>
        </AuthProvider>
      </I18nProvider>,
    );
  });

  mounted.push(renderer);

  return renderer;
}

function observedSnapshot(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(InventoryAlertObserver).props.snapshot;
}

beforeEach(async () => {
  jest.clearAllMocks();
  fetchItemsMock.mockResolvedValue([]);
  await AsyncStorage.clear();
});

it('keys inventory alerts by the signed-in account id', async () => {
  const renderer = await renderAlerts(ACCOUNT);

  expect(observedSnapshot(renderer).userId).toBe('user-1');
});

it('has no user while signed out', async () => {
  const renderer = await renderAlerts(null);

  expect(observedSnapshot(renderer)).toEqual({
    status: 'loading',
    userId: null,
  });
});

it("cancels the previous account's alerts on sign out", async () => {
  const renderer = await renderAlerts(ACCOUNT);

  await act(async () => {
    await signOut();
  });

  expect(observedSnapshot(renderer).userId).toBeNull();
  expect(mockDeactivate).toHaveBeenCalledWith('user-1');
});

describe('once the inventory is loaded', () => {
  it('hands the observer the stock it fetched', async () => {
    fetchItemsMock.mockResolvedValue([backendItem()] as never);

    const renderer = await renderAlerts(ACCOUNT);

    expect(observedSnapshot(renderer)).toMatchObject({
      status: 'ready',
      userId: 'user-1',
    });
    expect(observedSnapshot(renderer).items).toHaveLength(1);
  });

  it('notifies about an item that is below the minimum', async () => {
    fetchItemsMock.mockResolvedValue([backendItem()] as never);

    await renderAlerts(ACCOUNT);

    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('says the unit the way a person reads it, not the backend enum', async () => {
    fetchItemsMock.mockResolvedValue([backendItem()] as never);

    await renderAlerts(ACCOUNT);

    const [{ body }] = scheduleMock.mock.calls[0];

    expect(body).toContain('ampola');
    expect(body).not.toContain('AMPOULE');
  });

  it('stays quiet when every item is above its minimum', async () => {
    fetchItemsMock.mockResolvedValue([
      backendItem({ currentQuantity: '40' }),
    ] as never);

    await renderAlerts(ACCOUNT);

    expect(scheduleMock).not.toHaveBeenCalled();
  });
});

it('stays quiet when the inventory could not be loaded', async () => {
  fetchItemsMock.mockRejectedValue(new Error('network down'));

  const renderer = await renderAlerts(ACCOUNT);

  expect(observedSnapshot(renderer).status).toBe('loading');
  expect(scheduleMock).not.toHaveBeenCalled();
});
