import ReactTestRenderer, { act } from 'react-test-renderer';

import { AccountInventoryAlerts } from 'app/App';
import {
  AuthProvider,
  TERMS_VERSION,
  useAuth,
  type Account,
} from 'features/auth';
import { InventoryAlertObserver } from 'features/inventory';
import type { BackendItem } from 'features/materials';
import { fetchItems } from 'features/materials';
import { I18nProvider } from 'shared/i18n';
import { publishInventoryChange } from 'shared/services/inventoryEvents';

const mockDeactivate = jest.fn(async (_userId: string) => undefined);
const renderers = new Set<ReactTestRenderer.ReactTestRenderer>();

jest.mock('features/auth/services/authService', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/inventory/services/deactivateInventoryAlerts', () => ({
  deactivateInventoryAlerts: (userId: string) => mockDeactivate(userId),
}));
jest.mock('shared/services', () => ({
  initNotifications: jest.fn(),
  scheduleNotification: jest.fn().mockResolvedValue('low-stock-id'),
  scheduleNotificationAt: jest.fn().mockResolvedValue('expiry-id'),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('features/materials/services/itemService', () => ({
  fetchItems: jest.fn(),
}));

const fetchItemsMock = fetchItems as jest.MockedFunction<typeof fetchItems>;

const BACKEND_ITEMS: BackendItem[] = [
  {
    id: 'item-low',
    supplierId: null,
    category: 'MEDICATION',
    unit: 'AMPOULE',
    name: 'Dipirona',
    defaultUnitCost: '2.5000',
    minimumStock: '5.000',
    currentQuantity: '3.000',
    nearestExpiration: '2026-09-20',
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    deletedAt: null,
  },
  {
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
  },
];

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

let signOut: () => Promise<void>;

function CaptureSignOut() {
  signOut = useAuth().signOut;
  return null;
}

async function renderAlerts(account: Account | null) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider
        initialSession={account ? SESSION : null}
        initialAccount={account}
      >
        <I18nProvider>
          <CaptureSignOut />
          <AccountInventoryAlerts />
        </I18nProvider>
      </AuthProvider>,
    );
  });
  renderers.add(renderer);

  return renderer;
}

function observedSnapshot(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(InventoryAlertObserver).props.snapshot;
}

beforeEach(() => {
  mockDeactivate.mockClear();
  fetchItemsMock.mockReset();
  fetchItemsMock.mockResolvedValue(BACKEND_ITEMS);
});

afterEach(async () => {
  await act(async () => {
    renderers.forEach(renderer => renderer.unmount());
    renderers.clear();
  });
});

it('loads real API items into the signed-in account alert observer', async () => {
  const renderer = await renderAlerts(ACCOUNT);

  expect(observedSnapshot(renderer)).toEqual({
    status: 'ready',
    userId: 'user-1',
    items: [
      {
        id: 'item-low',
        name: 'Dipirona',
        unit: 'ampola',
        quantity: 3,
        minimumStock: 5,
      },
    ],
    lots: [
      {
        id: 'nearest:item-low:2026-09-20',
        itemId: 'item-low',
        name: 'Dipirona',
        expirationDate: '2026-09-20',
      },
    ],
  });
  expect(fetchItemsMock).toHaveBeenCalledWith('id');
});

it('reloads alerts after inventory changes in the current session', async () => {
  const renderer = await renderAlerts(ACCOUNT);
  fetchItemsMock.mockResolvedValue([]);

  await act(async () => {
    publishInventoryChange();
  });

  expect(fetchItemsMock).toHaveBeenCalledTimes(2);
  expect(observedSnapshot(renderer)).toEqual({
    status: 'ready',
    userId: 'user-1',
    items: [],
    lots: [],
  });
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
