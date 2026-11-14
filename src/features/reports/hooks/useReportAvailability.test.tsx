import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { NetworkError } from 'shared/api';
import { isOnline } from 'shared/services';
import { ApiError } from 'shared/services/apiClient';

import { useReportAvailability } from './useReportAvailability';
import { fetchReportAvailability } from '../services/reportAvailabilityService';

jest.mock('../services/reportAvailabilityService', () => ({
  fetchReportAvailability: jest.fn(),
}));
jest.mock('shared/services', () => ({ isOnline: jest.fn() }));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchAvailability = jest.mocked(fetchReportAvailability);
const isOnlineMock = jest.mocked(isOnline);

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

const PERIOD = { from: '2026-01-01', to: '2026-12-31' };

type HookState = ReturnType<typeof useReportAvailability>;

async function renderHook(session: typeof SESSION | null = SESSION) {
  const latest = { current: null as unknown as HookState };
  function Probe() {
    latest.current = useReportAvailability();
    return null;
  }
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={session ?? undefined}
        initialAccount={ACCOUNT}
      >
        <Probe />
      </AuthProvider>,
    );
  });
  return latest;
}

async function ensureRecords(state: { current: HookState }) {
  let result = false;
  await act(async () => {
    result = await state.current.ensureRecords(PERIOD);
  });
  return result;
}

beforeEach(() => {
  fetchAvailability.mockReset();
  isOnlineMock.mockReset();
  isOnlineMock.mockResolvedValue(true);
});

describe('useReportAvailability', () => {
  it.each([
    [1, true, null],
    [0, false, 'empty'],
  ])(
    'with total %i lets the caller go on: %s',
    async (total, expected, notice) => {
      fetchAvailability.mockResolvedValue({ total });
      const state = await renderHook();

      await expect(ensureRecords(state)).resolves.toBe(expected);

      expect(fetchAvailability).toHaveBeenCalledWith('id-token', PERIOD);
      expect(state.current.notice).toBe(notice);
      expect(state.current.isChecking).toBe(false);
    },
  );

  it.each([
    ['the device is offline', () => isOnlineMock.mockResolvedValue(false)],
    [
      'the request never reaches the API',
      () => fetchAvailability.mockRejectedValue(new NetworkError('down')),
    ],
  ])('says reports need internet when %s', async (_name, arrange) => {
    arrange();
    const state = await renderHook();

    await expect(ensureRecords(state)).resolves.toBe(false);

    expect(state.current.notice).toBe('offline');
  });

  it('reports any other API error as a failure', async () => {
    fetchAvailability.mockRejectedValue(
      new ApiError('bad', 'REPORT_PERIOD_INVALID', 400),
    );
    const state = await renderHook();

    await expect(ensureRecords(state)).resolves.toBe(false);

    expect(state.current.notice).toBe('failed');
  });

  it('does not ask the API without a session', async () => {
    const state = await renderHook(null);

    await expect(ensureRecords(state)).resolves.toBe(false);

    expect(isOnlineMock).not.toHaveBeenCalled();
    expect(fetchAvailability).not.toHaveBeenCalled();
  });

  it('clears the notice on dismiss and when a new check starts', async () => {
    fetchAvailability.mockResolvedValue({ total: 0 });
    const state = await renderHook();

    await ensureRecords(state);
    expect(state.current.notice).toBe('empty');

    await act(async () => {
      state.current.dismissNotice();
    });
    expect(state.current.notice).toBeNull();

    await ensureRecords(state);
    fetchAvailability.mockResolvedValue({ total: 2 });
    await ensureRecords(state);
    expect(state.current.notice).toBeNull();
  });
});
