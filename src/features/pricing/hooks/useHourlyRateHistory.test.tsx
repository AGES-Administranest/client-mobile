import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';

import { useHourlyRateHistory } from './useHourlyRateHistory';
import { OCTOBER_HOURLY_RATE } from '../domain/hourlyRate.fixture';
import { HISTORY_PERIODS } from '../domain/hourlyRateHistory.fixture';
import { pricingService } from '../services/pricingService';

jest.mock('../services/pricingService', () => ({
  pricingService: {
    getHourlyRateHistory: jest.fn(),
    getHourlyRateHistoryMonth: jest.fn(),
  },
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const getHistory = pricingService.getHourlyRateHistory as jest.MockedFunction<
  typeof pricingService.getHourlyRateHistory
>;

const getMonth =
  pricingService.getHourlyRateHistoryMonth as jest.MockedFunction<
    typeof pricingService.getHourlyRateHistoryMonth
  >;

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

const [OCTOBER, SEPTEMBER] = HISTORY_PERIODS;

let current: ReturnType<typeof useHourlyRateHistory>;

function Probe() {
  current = useHourlyRateHistory();
  return null;
}

async function mount(session: typeof SESSION | null) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={session} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
  return renderer;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 19, 17, 42),
    doNotFake: [
      'nextTick',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'hrtime',
    ],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  getHistory.mockReset();
  getMonth.mockReset().mockResolvedValue(OCTOBER_HOURLY_RATE);
});

test('asks for the history with the id token and sorts it newest first', async () => {
  getHistory.mockResolvedValue([SEPTEMBER, OCTOBER]);

  await mount(SESSION);

  expect(getHistory).toHaveBeenCalledWith('id-token');
  expect(current.state).toMatchObject({ status: 'ready' });
  const rows = (
    current.state as { rows: { rate: unknown; variation: number | null }[] }
  ).rows;
  expect(rows.map(row => row.rate)).toEqual([OCTOBER, SEPTEMBER]);
  expect(rows[0].variation).toBeCloseTo(2.36, 2);
});

test('is ready with no rows while there is no calculation', async () => {
  getHistory.mockResolvedValue([]);

  await mount(SESSION);

  expect(current.state).toEqual({
    status: 'ready',
    rows: [],
    safetyMarginPct: null,
  });
  expect(getMonth).not.toHaveBeenCalled();
});

test('is loading until the history arrives', async () => {
  getHistory.mockReturnValue(new Promise(() => {}));

  await mount(SESSION);

  expect(current.state).toEqual({ status: 'loading' });
});

test('reports a failure', async () => {
  getHistory.mockRejectedValue(new Error('offline'));

  await mount(SESSION);

  expect(current.state).toEqual({ status: 'error' });
});

test('does not call the API without a session', async () => {
  await mount(null);

  expect(getHistory).not.toHaveBeenCalled();
  expect(current.state).toEqual({ status: 'error' });
});

test('reload asks again and recovers from a failure', async () => {
  getHistory.mockRejectedValueOnce(new Error('offline'));
  await mount(SESSION);
  getHistory.mockResolvedValueOnce([OCTOBER]);

  await act(async () => current.reload());

  expect(getHistory).toHaveBeenCalledTimes(2);
  expect(current.state).toMatchObject({ status: 'ready' });
});

test('reads the margin from the detail of the newest month', async () => {
  getHistory.mockResolvedValue([SEPTEMBER, OCTOBER]);

  await mount(SESSION);

  expect(getMonth).toHaveBeenCalledTimes(1);
  expect(getMonth).toHaveBeenCalledWith('id-token', { month: 10, year: 2026 });
  expect(current.state).toMatchObject({ status: 'ready', safetyMarginPct: 20 });
});

test('is ready with the list before the detail answers, then gains the margin', async () => {
  const detail = deferred<typeof OCTOBER_HOURLY_RATE>();
  getHistory.mockResolvedValue([SEPTEMBER, OCTOBER]);
  getMonth.mockReturnValue(detail.promise);

  await mount(SESSION);

  expect(current.state).toMatchObject({
    status: 'ready',
    safetyMarginPct: null,
  });

  await act(async () => detail.resolve(OCTOBER_HOURLY_RATE));

  expect(current.state).toMatchObject({ status: 'ready', safetyMarginPct: 20 });
});

// A state update after unmounting is silent in React 18, so the guard shows
// only in what the hook does next: it must not go on to ask for the margin.
describe('unmounting before an answer', () => {
  let errors: jest.SpyInstance;

  beforeEach(() => {
    errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errors.mockRestore();
  });

  test('ignores the list and does not ask for the margin', async () => {
    const history = deferred<typeof HISTORY_PERIODS>();
    getHistory.mockReturnValue(history.promise);
    const renderer = await mount(SESSION);

    act(() => renderer.unmount());
    await act(async () => history.resolve([OCTOBER]));

    expect(getMonth).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });
});

test('stays ready without the margin when the detail fails', async () => {
  getHistory.mockResolvedValue([OCTOBER]);
  getMonth.mockRejectedValue(new Error('offline'));

  await mount(SESSION);

  expect(current.state).toMatchObject({
    status: 'ready',
    safetyMarginPct: null,
  });
});

test('stays ready without the margin when the month has no detail', async () => {
  getHistory.mockResolvedValue([OCTOBER]);
  getMonth.mockResolvedValue(null);

  await mount(SESSION);

  expect(current.state).toMatchObject({
    status: 'ready',
    safetyMarginPct: null,
  });
});
