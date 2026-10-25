import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { syncPendingClinics } from 'features/clients';
import { ServiceInvoiceSyncObserver } from 'features/serviceInvoices';
import type { PendingServiceInvoice } from 'features/serviceInvoices/domain/offlineServiceInvoices';
import { useServiceInvoiceSync } from 'features/serviceInvoices/hooks/useServiceInvoiceSync';
import { notifyOfflineServiceInvoicesChanged } from 'features/serviceInvoices/services/offlineServiceInvoiceStore';
import { syncPendingServiceInvoices } from 'features/serviceInvoices/services/serviceInvoiceSyncService';
import { onConnectionRestored } from 'shared/services';

jest.mock('features/clients', () => ({ syncPendingClinics: jest.fn() }));
jest.mock(
  'features/serviceInvoices/services/serviceInvoiceSyncService',
  () => ({
    syncPendingServiceInvoices: jest.fn(),
  }),
);
jest.mock('shared/services', () => ({ onConnectionRestored: jest.fn() }));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const syncClinics = jest.mocked(syncPendingClinics);
const syncInvoices = jest.mocked(syncPendingServiceInvoices);
const connection = jest.mocked(onConnectionRestored);

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
const OUTBOX_KEY = '@administranest:service-invoices:user-1:outbox';

function note(
  id: string,
  overrides: Partial<PendingServiceInvoice> = {},
): PendingServiceInvoice {
  return {
    id,
    issueDate: '2026-03-15',
    amount: 10,
    clientId: 'client-1',
    file: {
      name: 'a.pdf',
      mimeType: 'application/pdf',
      bytesSize: 1,
      hash: 'h',
    },
    createdAt: '2026-03-16T10:00:00.000Z',
    ...overrides,
  };
}

let appStateHandler: (state: string) => void = () => undefined;
const removeAppState = jest.fn();
let connectionHandler: () => void = () => undefined;
const removeConnection = jest.fn();
let addEventListener: jest.SpyInstance;

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

function Probe() {
  useServiceInvoiceSync();
  return null;
}

// Whatever tab is open: nothing here knows about invoices.
function OtherTab() {
  return null;
}

async function mount(signedIn = true) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider
        initialSession={signedIn ? SESSION : null}
        initialAccount={signedIn ? ACCOUNT : null}
      >
        <Probe />
      </AuthProvider>,
    );
  });
  mounted.push(renderer);
  return renderer;
}

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
  await AsyncStorage.clear();
  [
    syncClinics,
    syncInvoices,
    connection,
    removeAppState,
    removeConnection,
  ].forEach(mock => mock.mockReset());
  syncClinics.mockResolvedValue({ synced: 0, rejected: 0, pending: 0 });
  syncInvoices.mockResolvedValue({ synced: 0, rejected: 0, pending: 0 });
  connection.mockImplementation(handler => {
    connectionHandler = handler;
    return removeConnection;
  });
  addEventListener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      appStateHandler = handler as (state: string) => void;
      return { remove: removeAppState };
    });
});

afterEach(() => {
  act(() => mounted.splice(0).forEach(renderer => renderer.unmount()));
  addEventListener.mockRestore();
  jest.useRealTimers();
});

describe('useServiceInvoiceSync', () => {
  it('does nothing without a session', async () => {
    await mount(false);

    expect(syncClinics).not.toHaveBeenCalled();
    expect(syncInvoices).not.toHaveBeenCalled();
  });

  it('syncs the takers before the notes, as soon as it opens', async () => {
    const order: string[] = [];
    syncClinics.mockImplementation(async () => {
      order.push('takers');
      return { synced: 0, rejected: 0, pending: 0 };
    });
    syncInvoices.mockImplementation(async () => {
      order.push('notes');
      return { synced: 0, rejected: 0, pending: 0 };
    });

    await mount();

    expect(order).toEqual(['takers', 'notes']);
    expect(syncInvoices).toHaveBeenCalledWith('id-token', 'user-1');
  });

  it('syncs again when the app comes back to the foreground', async () => {
    await mount();
    syncInvoices.mockClear();

    await act(async () => appStateHandler('background'));
    expect(syncInvoices).not.toHaveBeenCalled();
    await act(async () => appStateHandler('active'));

    expect(syncInvoices).toHaveBeenCalledTimes(1);
  });

  it('syncs again when the connection comes back', async () => {
    await mount();
    syncInvoices.mockClear();

    await act(async () => connectionHandler());

    expect(syncInvoices).toHaveBeenCalledTimes(1);
  });

  it('syncs again when a note enters the queue', async () => {
    await mount();
    syncInvoices.mockClear();

    await act(async () => notifyOfflineServiceInvoicesChanged());

    expect(syncInvoices).toHaveBeenCalledTimes(1);
  });

  it('retries every 30 s while a note is waiting', async () => {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([note('a')]));
    await mount();
    syncInvoices.mockClear();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(30_000);
    });

    expect(syncInvoices).toHaveBeenCalledTimes(1);
  });

  it('does not keep retrying when only refused notes are left, or none', async () => {
    await AsyncStorage.setItem(
      OUTBOX_KEY,
      JSON.stringify([
        note('a', { rejection: { code: 'X', acknowledged: true } }),
      ]),
    );
    await mount();
    syncInvoices.mockClear();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(90_000);
    });

    expect(syncInvoices).not.toHaveBeenCalled();
  });

  it('stops listening and retrying when it closes', async () => {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([note('a')]));
    const renderer = await mount();
    syncInvoices.mockClear();

    act(() => renderer.unmount());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
      notifyOfflineServiceInvoicesChanged();
    });

    expect(removeAppState).toHaveBeenCalledTimes(1);
    expect(removeConnection).toHaveBeenCalledTimes(1);
    expect(syncInvoices).not.toHaveBeenCalled();
  });
});

describe('ServiceInvoiceSyncObserver', () => {
  async function mountApp() {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <OtherTab />
          <ServiceInvoiceSyncObserver />
        </AuthProvider>,
      );
    });
    mounted.push(renderer);
    return renderer;
  }

  it('sends the queue when the connection comes back, with another tab open', async () => {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([note('a')]));
    await mountApp();
    syncInvoices.mockClear();

    await act(async () => connectionHandler());

    expect(syncClinics).toHaveBeenCalled();
    expect(syncInvoices).toHaveBeenCalledWith('id-token', 'user-1');
  });

  it('draws nothing', async () => {
    const renderer = await mountApp();

    expect(renderer.toJSON()).toBeNull();
  });
});
