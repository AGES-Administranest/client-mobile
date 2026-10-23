import { useState } from 'react';
import { Pressable } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { fetchFixedCostsSummary } from 'features/calculator';
import { equipmentService } from 'features/equipment';
import { fetchAppointments } from 'features/procedures';
import { NetworkError } from 'shared/api';
import { onConnectionRestored } from 'shared/services/network';

import { useFinanceOverview } from './useFinanceOverview';
import type { FinancialEntry } from '../domain/financialEntry';
import type { MonthlyBalance } from '../domain/monthlyBalance';
import {
  clearBalanceCache,
  rememberPendingEntry,
  saveBalanceEntries,
} from '../services/balanceCache';
import {
  fetchAllMonthlyFinancialEntries,
  fetchFinancialBalance,
} from '../services/financialEntryService';

jest.mock('../services/financialEntryService', () => ({
  fetchAllMonthlyFinancialEntries: jest.fn(),
  fetchFinancialBalance: jest.fn(),
}));
jest.mock('features/calculator', () => ({
  fetchFixedCostsSummary: jest.fn(),
}));
jest.mock('features/equipment', () => ({
  equipmentService: { summary: jest.fn() },
}));
jest.mock('features/procedures', () => ({
  calculateHoursWorked: jest.fn(() => ({ minutes: 0 })),
  fetchAppointments: jest.fn(),
}));
jest.mock('shared/services/network', () => ({
  onConnectionRestored: jest.fn(() => jest.fn()),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchBalanceMock = fetchFinancialBalance as jest.MockedFunction<
  typeof fetchFinancialBalance
>;
const fetchEntriesMock = fetchAllMonthlyFinancialEntries as jest.MockedFunction<
  typeof fetchAllMonthlyFinancialEntries
>;
const fetchCostsMock = fetchFixedCostsSummary as jest.MockedFunction<
  typeof fetchFixedCostsSummary
>;
const summaryMock = equipmentService.summary as jest.MockedFunction<
  typeof equipmentService.summary
>;
const fetchAppointmentsMock = fetchAppointments as jest.MockedFunction<
  typeof fetchAppointments
>;
const restoredMock = onConnectionRestored as jest.MockedFunction<
  typeof onConnectionRestored
>;

const PERIOD = { month: 3, year: 2026 };
const offline = new NetworkError('offline');

function stored(
  partial: Pick<FinancialEntry, 'id' | 'nature' | 'scope' | 'amount' | 'accrualDate'> & {
    categoryName: string;
  },
): FinancialEntry {
  return {
    id: partial.id,
    nature: partial.nature,
    description: partial.categoryName,
    category: {
      id: partial.id,
      name: partial.categoryName,
      scope: partial.scope,
    },
    scope: partial.scope,
    amount: partial.amount,
    accrualDate: partial.accrualDate,
    source: 'MANUAL',
    origin: { type: 'MANUAL', id: null },
  };
}

const SERVER: MonthlyBalance = {
  revenue: 1000,
  professionalExpenses: 174.1,
  personalExpenses: 25.15,
  totalExpenses: 199.25,
  netBalance: 800.75,
  expensesByCategory: [],
  incomplete: false,
};

const SESSION: AuthSession = {
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

const seen: (number | null)[] = [];
const incompleteSeen: boolean[] = [];

function Probe({
  period = PERIOD,
}: {
  period?: { month: number; year: number };
}) {
  const state = useFinanceOverview(period);
  seen.push(state.overview ? state.overview.netBalance : null);
  incompleteSeen.push(state.incomplete);
  return null;
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

async function mount() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
  mounted.push(renderer);
  return renderer;
}

afterEach(() => {
  mounted.splice(0).forEach(renderer => {
    act(() => renderer.unmount());
  });
});

beforeEach(() => {
  seen.length = 0;
  incompleteSeen.length = 0;
  clearBalanceCache();
  fetchBalanceMock.mockReset();
  fetchEntriesMock.mockReset().mockResolvedValue([]);
  fetchCostsMock.mockReset().mockResolvedValue({
    professionalExpenses: 0,
    personalExpenses: 0,
    equipmentDepreciation: 0,
    transportCost: 0,
    total: 0,
  });
  summaryMock.mockReset().mockResolvedValue({
    monthlyTotal: 0,
    yearlyTotal: 0,
    count: 0,
  });
  fetchAppointmentsMock.mockReset().mockResolvedValue([]);
  restoredMock.mockClear();
});

test('an online load shows the backend balance', async () => {
  fetchBalanceMock.mockResolvedValue(SERVER);

  await mount();

  expect(fetchBalanceMock).toHaveBeenCalledWith('id-token', PERIOD);
  expect(seen.at(-1)).toBe(800.75);
});

test('offline, the header uses local entries, including one still pending sync', async () => {
  saveBalanceEntries(PERIOD, [
    stored({
      id: 'income',
      nature: 'INCOME',
      scope: 'PROFESSIONAL',
      amount: 100,
      accrualDate: '2026-03-10T12:00:00.000Z',
      categoryName: 'Professional fees',
    }),
    stored({
      id: 'fuel',
      nature: 'EXPENSE',
      scope: 'PROFESSIONAL',
      amount: 30,
      accrualDate: '2026-03-12T12:00:00.000Z',
      categoryName: 'Travel',
    }),
  ]);
  rememberPendingEntry(
    PERIOD,
    stored({
      id: 'pending',
      nature: 'EXPENSE',
      scope: 'PERSONAL',
      amount: 10,
      accrualDate: '2026-03-20T12:00:00.000Z',
      categoryName: 'Supplies',
    }),
  );
  fetchBalanceMock.mockRejectedValue(offline);
  fetchEntriesMock.mockRejectedValue(offline);
  fetchCostsMock.mockRejectedValue(offline);
  summaryMock.mockRejectedValue(offline);

  await mount();

  expect(seen.at(-1)).toBe(60);
  expect(incompleteSeen.at(-1)).toBe(true);
});

test('reconnecting replaces the local total and does not blank the header', async () => {
  saveBalanceEntries(PERIOD, [
    stored({
      id: 'income',
      nature: 'INCOME',
      scope: 'PROFESSIONAL',
      amount: 100,
      accrualDate: '2026-03-10T12:00:00.000Z',
      categoryName: 'Professional fees',
    }),
  ]);
  fetchBalanceMock.mockRejectedValueOnce(offline).mockResolvedValue(SERVER);
  fetchEntriesMock.mockRejectedValue(offline);
  fetchCostsMock.mockResolvedValue({
    professionalExpenses: 0,
    personalExpenses: 0,
    equipmentDepreciation: 12,
    transportCost: 3,
    total: 15,
  });
  summaryMock.mockResolvedValue({
    monthlyTotal: 12,
    yearlyTotal: 144,
    count: 1,
  });

  await mount();

  expect(seen.at(-1)).toBe(85);
  const afterLocal = seen.length;

  const listener = restoredMock.mock.calls.at(-1)?.[0];
  await act(async () => {
    listener?.();
  });

  expect(seen.at(-1)).toBe(800.75);
  expect(seen.slice(afterLocal).every(value => value !== null)).toBe(true);
});

test('a month change keeps the number on screen until the next balance arrives', async () => {
  fetchBalanceMock.mockImplementation(async (_token, period) =>
    period.month === 3 ? SERVER : { ...SERVER, netBalance: 10, revenue: 10 },
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const Harness = () => {
    const [period, setPeriod] = useState(PERIOD);
    return (
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe period={period} />
        <Switch
          onPress={() => {
            seen.length = 0;
            setPeriod({ month: 4, year: 2026 });
          }}
        />
      </AuthProvider>
    );
  };

  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  mounted.push(renderer);
  expect(seen.at(-1)).toBe(800.75);

  await act(async () => {
    renderer.root.findByType(Switch).props.onPress();
  });

  expect(seen[0]).toBe(800.75);
  expect(seen.at(-1)).toBe(10);
  expect(seen.includes(null)).toBe(false);
});

function Switch({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} />;
}
