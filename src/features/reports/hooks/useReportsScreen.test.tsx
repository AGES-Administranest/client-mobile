import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { NetworkError } from 'shared/api';
import { isOnline } from 'shared/services';
import { ApiError, RequestTimeoutError } from 'shared/services/apiClient';

import { useReportsScreen } from './useReportsScreen';
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

const CURRENT_MONTH = { from: '2026-11-01', to: '2026-11-02' };

type HookState = ReturnType<typeof useReportsScreen>;

async function renderHook() {
  const latest = { current: null as unknown as HookState };
  function Probe() {
    latest.current = useReportsScreen();
    return null;
  }
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
  return latest;
}

async function check(state: { current: HookState }) {
  let canGoOn = false;
  await act(async () => {
    canGoOn = await state.current.checkPeriod();
  });
  return canGoOn;
}

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(Date.UTC(2026, 10, 2, 15)),
    doNotFake: [
      'nextTick',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  fetchAvailability.mockReset();
  isOnlineMock.mockReset();
  isOnlineMock.mockResolvedValue(true);
});

describe('useReportsScreen', () => {
  it('refuses an end before the start without asking the API', async () => {
    const state = await renderHook();

    await act(async () => {
      state.current.selectChoice('custom');
    });
    await act(async () => {
      state.current.setRange({ from: '2026-11-02', to: '2026-11-01' });
    });

    expect(state.current.periodError).toBe('END_BEFORE_START');
    expect(state.current.canGenerate).toBe(false);
    expect(await check(state)).toBe(false);
    expect(isOnlineMock).not.toHaveBeenCalled();
    expect(fetchAvailability).not.toHaveBeenCalled();
  });

  it('lets the period go on when it has records', async () => {
    fetchAvailability.mockResolvedValue({ total: 5 });
    const state = await renderHook();

    expect(await check(state)).toBe(true);
    expect(fetchAvailability).toHaveBeenCalledWith('id-token', CURRENT_MONTH);
    expect(state.current.notice).toBeNull();
    expect(state.current.isChecking).toBe(false);
  });

  it('warns that the period has no records and stops there', async () => {
    fetchAvailability.mockResolvedValue({ total: 0 });
    const state = await renderHook();

    expect(await check(state)).toBe(false);
    expect(state.current.notice).toBe('empty');
  });

  it('warns that reports need internet without asking the API when offline', async () => {
    isOnlineMock.mockResolvedValue(false);
    const state = await renderHook();

    expect(await check(state)).toBe(false);
    expect(state.current.notice).toBe('offline');
    expect(fetchAvailability).not.toHaveBeenCalled();
  });

  it.each([
    ['a request that never reached the API', new NetworkError('no network')],
    [
      'a request with no answer in time',
      new RequestTimeoutError('GET', '/reports/availability', 10_000),
    ],
  ])('treats %s as offline', async (_name, error) => {
    fetchAvailability.mockRejectedValue(error);
    const state = await renderHook();

    expect(await check(state)).toBe(false);
    expect(state.current.notice).toBe('offline');
  });

  it('shows a general failure when the API answers with an error', async () => {
    fetchAvailability.mockRejectedValue(
      new ApiError('boom', 'INTERNAL_ERROR', 500),
    );
    const state = await renderHook();

    expect(await check(state)).toBe(false);
    expect(state.current.notice).toBe('failed');
  });

  it.each([
    ['a shortcut', (state: HookState) => state.selectChoice('previousMonth')],
    [
      'the custom range',
      (state: HookState) =>
        state.setRange({ from: '2026-10-01', to: '2026-10-05' }),
    ],
  ])('drops the notice when %s changes the period', async (_name, change) => {
    fetchAvailability.mockResolvedValue({ total: 0 });
    const state = await renderHook();

    await check(state);
    expect(state.current.notice).toBe('empty');

    await act(async () => {
      change(state.current);
    });

    expect(state.current.notice).toBeNull();
  });

  it('drops a check still running when the period changes', async () => {
    let answer: (value: { total: number }) => void = () => undefined;
    fetchAvailability.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    const state = await renderHook();

    let stale: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      stale = state.current.checkPeriod();
    });
    await act(async () => {
      state.current.selectChoice('previousMonth');
    });

    expect(state.current.canGenerate).toBe(true);

    await act(async () => {
      answer({ total: 0 });
      await stale;
    });

    expect(await stale).toBe(false);
    expect(state.current.notice).toBeNull();
  });

  it('checks once and blocks the cards while the check is running', async () => {
    let answer: (value: { total: number }) => void = () => undefined;
    fetchAvailability.mockReturnValue(
      new Promise(resolve => {
        answer = resolve;
      }),
    );
    const state = await renderHook();

    let first: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      first = state.current.checkPeriod();
    });

    expect(state.current.isChecking).toBe(true);
    expect(state.current.canGenerate).toBe(false);
    expect(await check(state)).toBe(false);

    await act(async () => {
      answer({ total: 1 });
      await first;
    });

    expect(await first).toBe(true);
    expect(fetchAvailability).toHaveBeenCalledTimes(1);
    expect(state.current.canGenerate).toBe(true);
  });
});
