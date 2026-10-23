import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { useHourlyRate } from './useHourlyRate';
import { calculateHourlyRate } from '../domain/hourlyRate';
import { pricingService } from '../services/pricingService';

jest.mock('../services/pricingService', () => ({
  pricingService: { getHourlyRate: jest.fn() },
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const getHourlyRate = pricingService.getHourlyRate as jest.MockedFunction<
  typeof pricingService.getHourlyRate
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

const OCTOBER = { month: 10, year: 2026 };
const SEPTEMBER = { month: 9, year: 2026 };

function rateFor(month: MonthPeriod, variableCosts = 1225) {
  return calculateHourlyRate({
    month,
    settings: { monthlyIncomeGoal: 8000, weeklyHours: 30, safetyMarginPct: 20 },
    fixedCosts: 1399.08,
    variableCosts,
    calculatedAt: new Date('2026-10-19T20:42:00.000Z'),
  });
}

let current: ReturnType<typeof useHourlyRate>;
let renderer: ReactTestRenderer.ReactTestRenderer;

function Probe({ month }: { month: MonthPeriod }) {
  current = useHourlyRate(month);
  return null;
}

async function mount(month: MonthPeriod, session: typeof SESSION | null) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={session} initialAccount={ACCOUNT}>
        <Probe month={month} />
      </AuthProvider>,
    );
  });
}

async function changeMonth(month: MonthPeriod) {
  await act(async () => {
    renderer.update(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe month={month} />
      </AuthProvider>,
    );
  });
}

beforeEach(() => {
  getHourlyRate.mockReset();
});

test('asks for the rate of the month with the id token', async () => {
  getHourlyRate.mockResolvedValue(rateFor(OCTOBER));

  await mount(OCTOBER, SESSION);

  expect(getHourlyRate).toHaveBeenCalledWith('id-token', OCTOBER);
  expect(current.state).toEqual({
    status: 'ready',
    hourlyRate: rateFor(OCTOBER),
    isRefreshing: false,
  });
});

test('is unconfigured while the goals do not exist', async () => {
  getHourlyRate.mockResolvedValue(null);

  await mount(OCTOBER, SESSION);

  expect(current.state).toEqual({ status: 'unconfigured' });
});

test('reports a failure', async () => {
  getHourlyRate.mockRejectedValue(new Error('offline'));

  await mount(OCTOBER, SESSION);

  expect(current.state).toEqual({ status: 'error' });
});

test('does not call the API without a session', async () => {
  await mount(OCTOBER, null);

  expect(getHourlyRate).not.toHaveBeenCalled();
  expect(current.state).toEqual({ status: 'error' });
});

test('recalculates with the costs of the month that was picked', async () => {
  getHourlyRate.mockImplementation(async (_token, month) =>
    rateFor(month, month.month === 9 ? 980 : 1225),
  );
  await mount(OCTOBER, SESSION);

  await changeMonth(SEPTEMBER);

  expect(getHourlyRate).toHaveBeenLastCalledWith('id-token', SEPTEMBER);
  expect(current.state).toMatchObject({
    status: 'ready',
    hourlyRate: { month: SEPTEMBER, hourlyRate: 95.81 },
  });
});

test('keeps the previous result on screen while the next month loads', async () => {
  getHourlyRate.mockResolvedValueOnce(rateFor(OCTOBER));
  await mount(OCTOBER, SESSION);
  getHourlyRate.mockReturnValueOnce(new Promise(() => {}));

  await changeMonth(SEPTEMBER);

  expect(current.state).toEqual({
    status: 'ready',
    hourlyRate: rateFor(OCTOBER),
    isRefreshing: true,
  });
});

test('ignores the answer of a month the person already left', async () => {
  let answerOctober!: (rate: ReturnType<typeof rateFor>) => void;
  getHourlyRate.mockReturnValueOnce(
    new Promise(resolve => {
      answerOctober = resolve;
    }),
  );
  await mount(OCTOBER, SESSION);
  getHourlyRate.mockResolvedValueOnce(rateFor(SEPTEMBER, 980));
  await changeMonth(SEPTEMBER);

  await act(async () => answerOctober(rateFor(OCTOBER)));

  expect(current.state).toMatchObject({
    hourlyRate: { month: SEPTEMBER },
  });
});

test('reload asks again after a save, without leaving the month', async () => {
  getHourlyRate.mockResolvedValueOnce(rateFor(OCTOBER));
  await mount(OCTOBER, SESSION);
  getHourlyRate.mockResolvedValueOnce(rateFor(OCTOBER, 2000));

  await act(async () => current.reload());

  expect(getHourlyRate).toHaveBeenCalledTimes(2);
  expect(getHourlyRate).toHaveBeenLastCalledWith('id-token', OCTOBER);
  expect(current.state).toMatchObject({
    hourlyRate: { parts: { variableCosts: 2000 } },
  });
});
