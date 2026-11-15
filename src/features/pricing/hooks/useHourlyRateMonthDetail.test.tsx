import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { useHourlyRateMonthDetail } from './useHourlyRateMonthDetail';
import {
  OCTOBER_HOURLY_RATE,
  SEPTEMBER_HOURLY_RATE,
} from '../domain/hourlyRate.fixture';
import { pricingService } from '../services/pricingService';

// Only the read is mocked: the hook must not need anything else from the
// service, saveSettings included.
jest.mock('../services/pricingService', () => ({
  pricingService: {
    getHourlyRateHistoryMonth: jest.fn(),
  },
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

const SEPTEMBER: MonthPeriod = { month: 9, year: 2026 };
const OCTOBER: MonthPeriod = { month: 10, year: 2026 };

let current: ReturnType<typeof useHourlyRateMonthDetail>;

function Probe({ month }: { month: MonthPeriod }) {
  current = useHourlyRateMonthDetail(month);
  return null;
}

function tree(session: typeof SESSION | null, month: MonthPeriod) {
  return (
    <AuthProvider initialSession={session} initialAccount={ACCOUNT}>
      <Probe month={month} />
    </AuthProvider>
  );
}

async function mount(session: typeof SESSION | null, month = SEPTEMBER) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(tree(session, month));
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
  getMonth.mockReset().mockResolvedValue(SEPTEMBER_HOURLY_RATE);
});

afterEach(() => {
  jest.useRealTimers();
});

test('asks for the month with the id token and is ready with what was stored', async () => {
  await mount(SESSION);

  expect(getMonth).toHaveBeenCalledTimes(1);
  expect(getMonth).toHaveBeenCalledWith('id-token', SEPTEMBER);
  expect(current.state).toEqual({
    status: 'ready',
    hourlyRate: SEPTEMBER_HOURLY_RATE,
  });
});

test('is loading until the month answers', async () => {
  getMonth.mockReturnValue(new Promise(() => {}));

  await mount(SESSION);

  expect(current.state).toEqual({ status: 'loading' });
});

test('reports a failure', async () => {
  getMonth.mockRejectedValue(new Error('offline'));

  await mount(SESSION);

  expect(current.state).toEqual({ status: 'error' });
});

test('a month with no stored calculation is not a failure', async () => {
  getMonth.mockResolvedValue(null);

  await mount(SESSION);

  expect(current.state).toEqual({ status: 'notFound' });
});

test('does not call the API without a session', async () => {
  await mount(null);

  expect(getMonth).not.toHaveBeenCalled();
  expect(current.state).toEqual({ status: 'error' });
});

test('reload asks again and recovers from a failure', async () => {
  getMonth.mockRejectedValueOnce(new Error('offline'));
  await mount(SESSION);
  expect(current.state).toEqual({ status: 'error' });

  await act(async () => current.reload());

  expect(getMonth).toHaveBeenCalledTimes(2);
  expect(current.state).toMatchObject({ status: 'ready' });
});

test('reload retries a month that had no calculation', async () => {
  getMonth.mockResolvedValueOnce(null);
  await mount(SESSION);

  await act(async () => current.reload());

  expect(current.state).toMatchObject({ status: 'ready' });
});

test('asks again when the month changes', async () => {
  const renderer = await mount(SESSION, SEPTEMBER);
  getMonth.mockResolvedValue(OCTOBER_HOURLY_RATE);

  await act(async () => renderer.update(tree(SESSION, OCTOBER)));

  expect(getMonth).toHaveBeenLastCalledWith('id-token', OCTOBER);
  expect(current.state).toEqual({
    status: 'ready',
    hourlyRate: OCTOBER_HOURLY_RATE,
  });
});

test('ignores the answer of the previous month once the month changed', async () => {
  const first = deferred<typeof SEPTEMBER_HOURLY_RATE>();
  getMonth.mockReturnValueOnce(first.promise);
  const renderer = await mount(SESSION, SEPTEMBER);
  getMonth.mockResolvedValue(OCTOBER_HOURLY_RATE);

  await act(async () => renderer.update(tree(SESSION, OCTOBER)));
  await act(async () => first.resolve(SEPTEMBER_HOURLY_RATE));

  expect(current.state).toEqual({
    status: 'ready',
    hourlyRate: OCTOBER_HOURLY_RATE,
  });
});

describe('unmounting before the answer', () => {
  let errors: jest.SpyInstance;

  beforeEach(() => {
    errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errors.mockRestore();
  });

  test('ignores it', async () => {
    const answer = deferred<typeof SEPTEMBER_HOURLY_RATE>();
    getMonth.mockReturnValue(answer.promise);
    const renderer = await mount(SESSION);

    act(() => renderer.unmount());
    await act(async () => answer.resolve(SEPTEMBER_HOURLY_RATE));

    expect(current.state).toEqual({ status: 'loading' });
    expect(errors).not.toHaveBeenCalled();
  });

  test('ignores a failure too', async () => {
    const answer = deferred<never>();
    getMonth.mockReturnValue(answer.promise);
    const renderer = await mount(SESSION);

    act(() => renderer.unmount());
    await act(async () => answer.reject(new Error('offline')));

    expect(current.state).toEqual({ status: 'loading' });
    expect(errors).not.toHaveBeenCalled();
  });
});
