import ReactTestRenderer, { act } from 'react-test-renderer';

import { AccountInventoryAlerts } from 'app/App';
import {
  AuthProvider,
  TERMS_VERSION,
  useAuth,
  type Account,
} from 'features/auth';
import { InventoryAlertObserver } from 'features/inventory';

const mockDeactivate = jest.fn(async (_userId: string) => undefined);

jest.mock('features/auth/services/authService', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));
jest.mock('features/inventory/services/deactivateInventoryAlerts', () => ({
  deactivateInventoryAlerts: (userId: string) => mockDeactivate(userId),
}));

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
        <CaptureSignOut />
        <AccountInventoryAlerts />
      </AuthProvider>,
    );
  });

  return renderer;
}

function observedSnapshot(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findByType(InventoryAlertObserver).props.snapshot;
}

beforeEach(() => mockDeactivate.mockClear());

it('keys inventory alerts by the signed-in account id', async () => {
  const renderer = await renderAlerts(ACCOUNT);

  expect(observedSnapshot(renderer)).toEqual({
    status: 'loading',
    userId: 'user-1',
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
