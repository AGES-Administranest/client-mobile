import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, type AuthSession } from 'features/auth';

import { useServiceInvoices } from './useServiceInvoices';
import { fetchServiceInvoices } from '../services/serviceInvoiceService';

jest.mock('../services/serviceInvoiceService', () => ({
  fetchServiceInvoices: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchServiceInvoices as jest.MockedFunction<
  typeof fetchServiceInvoices
>;

const SESSION: AuthSession = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

async function mountHook(session: AuthSession | null) {
  const result = {
    current: null as unknown as ReturnType<typeof useServiceInvoices>,
  };

  function Harness() {
    result.current = useServiceInvoices(5);
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={session}>
        <Harness />
      </AuthProvider>,
    );
  });

  return { result, renderer };
}

beforeEach(() => {
  fetchMock.mockReset();
});

test('does not ask for notes without a session', async () => {
  const { result } = await mountHook(null);

  expect(fetchMock).not.toHaveBeenCalled();
  expect(result.current.status).toBe('loading');
});

test('ignores an answer that arrives after it was unmounted', async () => {
  let resolve!: (value: never[]) => void;
  fetchMock.mockReturnValue(new Promise(done => (resolve = done)));
  const { result, renderer } = await mountHook(SESSION);

  await act(async () => renderer.unmount());
  await act(async () => resolve([]));

  expect(result.current.status).toBe('loading');
});
