import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { fetchFixedCostsSummary } from 'features/calculator';
import { equipmentService } from 'features/equipment';
import {
  calculateHoursWorked,
  fetchAppointments,
  type AppointmentResult,
} from 'features/procedures';
import { onConnectionRestored } from 'shared/services/network';
import { isNetworkError } from 'shared/utils/network';

import type { FinancialEntry } from '../domain/financialEntry';
import {
  calculateMonthlyBalance,
  type BalanceEntry,
  type MonthlyBalance,
} from '../domain/monthlyBalance';
import type { StatementPeriod } from '../domain/statement';
import {
  entriesFromCache,
  onBalanceCacheChange,
  readBalanceCache,
  saveBalanceAdjustments,
  saveBalanceEntries,
} from '../services/balanceCache';
import {
  fetchAllMonthlyFinancialEntries,
  fetchFinancialBalance,
} from '../services/financialEntryService';

export type FinanceOverview = {
  revenue: number;
  professionalExpenses: number;
  personalExpenses: number;
  netBalance: number;
  hoursWorked: number;
  averageHourly: number | null;
  depreciation: number;
  equipmentCount: number;
};

export type FinanceOverviewState = {
  overview: FinanceOverview | null;
  isLoading: boolean;
  hasError: boolean;
  incomplete: boolean;
  retry: () => void;
};

const PAGE_SIZE_APPOINTMENTS = 100;

async function fetchAllCompletedAppointments(
  token: string,
  period: StatementPeriod,
): Promise<AppointmentResult[]> {
  const from = new Date(
    Date.UTC(period.year, period.month - 1, 1),
  ).toISOString();
  const to = new Date(
    Date.UTC(period.year, period.month, 0, 23, 59, 59, 999),
  ).toISOString();
  const appointments: AppointmentResult[] = [];
  for (let page = 1; ; page += 1) {
    const results = await fetchAppointments(token, {
      status: 'COMPLETED',
      from,
      to,
      page,
    });
    appointments.push(...results);
    if (results.length < PAGE_SIZE_APPOINTMENTS) return appointments;
  }
}

function toBalanceEntry(
  entry: FinancialEntry & { pendingSync?: boolean; deletedAt?: string | null },
): BalanceEntry {
  return {
    id: entry.id,
    nature: entry.nature,
    scope: entry.scope,
    amount: entry.amount,
    accrualDate: entry.accrualDate,
    categoryName: entry.category.name,
    deletedAt: entry.deletedAt,
    pendingSync: entry.pendingSync,
  };
}

function withTotals(
  current: FinanceOverview | null,
  balance: MonthlyBalance,
): FinanceOverview {
  return {
    revenue: balance.revenue,
    professionalExpenses: balance.professionalExpenses,
    personalExpenses: balance.personalExpenses,
    netBalance: balance.netBalance,
    hoursWorked: current?.hoursWorked ?? 0,
    averageHourly: current?.averageHourly ?? null,
    depreciation: current?.depreciation ?? 0,
    equipmentCount: current?.equipmentCount ?? 0,
  };
}

function localEntries(period: StatementPeriod): BalanceEntry[] {
  return entriesFromCache(readBalanceCache(period)).map(entry =>
    toBalanceEntry(entry),
  );
}

const EMPTY_OVERVIEW: FinanceOverview = {
  revenue: 0,
  professionalExpenses: 0,
  personalExpenses: 0,
  netBalance: 0,
  hoursWorked: 0,
  averageHourly: null,
  depreciation: 0,
  equipmentCount: 0,
};

export function useFinanceOverview(
  period: StatementPeriod,
): FinanceOverviewState {
  const { session } = useAuth();
  const token = session?.idToken;
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;

    const load = () => {
      const currentRequest = ++request;
      if (!token) {
        const cached = readBalanceCache(period);
        const balance = calculateMonthlyBalance(
          entriesFromCache(cached).map(entry => toBalanceEntry(entry)),
          period,
          {
            depreciation: cached.depreciation,
          },
        );
        if (active && currentRequest === request) {
          setOverview(current => withTotals(current, balance));
          setIncomplete(balance.incomplete);
          setHasError(false);
          setIsLoading(false);
        }
        return;
      }

      const settled = Promise.allSettled([
        fetchFinancialBalance(token, period),
        fetchAllMonthlyFinancialEntries(token, period),
        fetchFixedCostsSummary(token, period),
        fetchAllCompletedAppointments(token, period),
        equipmentService.summary(token),
      ]);

      settled.then(results => {
        if (!active || currentRequest !== request) return;
        const [
          balanceResult,
          entriesResult,
          costsResult,
          appointmentsResult,
          equipmentResult,
        ] = results;

        if (entriesResult.status === 'fulfilled') {
          saveBalanceEntries(period, entriesResult.value);
        }
        if (costsResult.status === 'fulfilled') {
          saveBalanceAdjustments(period, {
            depreciation: costsResult.value.equipmentDepreciation,
          });
        } else if (equipmentResult.status === 'fulfilled') {
          saveBalanceAdjustments(period, {
            depreciation: equipmentResult.value.monthlyTotal,
          });
        }

        const cached = readBalanceCache(period);
        setOverview(current => {
          let next = current;
          if (appointmentsResult.status === 'fulfilled') {
            const work = appointmentsResult.value.reduce(
              (total, appointment) => {
                if (!appointment.endsAt) return total;
                const duration = calculateHoursWorked(
                  appointment.startsAt,
                  appointment.endsAt,
                  appointment.amount,
                );
                return {
                  minutes: total.minutes + duration.minutes,
                  billed: total.billed + (Number(appointment.amount) || 0),
                };
              },
              { minutes: 0, billed: 0 },
            );
            const hoursWorked = work.minutes / 60;
            next = {
              ...(next ?? EMPTY_OVERVIEW),
              hoursWorked,
              averageHourly: hoursWorked > 0 ? work.billed / hoursWorked : null,
            };
          }
          if (costsResult.status === 'fulfilled') {
            next = {
              ...(next ?? EMPTY_OVERVIEW),
              depreciation: costsResult.value.equipmentDepreciation,
            };
          }
          if (equipmentResult.status === 'fulfilled') {
            next = {
              ...(next ?? EMPTY_OVERVIEW),
              equipmentCount: equipmentResult.value.count,
            };
          }
          if (balanceResult.status === 'fulfilled' && balanceResult.value) {
            return withTotals(next, balanceResult.value);
          }
          if (
            balanceResult.status === 'rejected' &&
            isNetworkError(balanceResult.reason)
          ) {
            return withTotals(
              next,
              calculateMonthlyBalance(localEntries(period), period, {
                depreciation: cached.depreciation,
              }),
            );
          }
          return next;
        });

        if (balanceResult.status === 'fulfilled') {
          setIncomplete(false);
          setHasError(false);
        } else if (
          balanceResult.status === 'rejected' &&
          isNetworkError(balanceResult.reason)
        ) {
          setIncomplete(cached.depreciation === null);
          setHasError(false);
        } else {
          setHasError(true);
        }
        setIsLoading(false);
      });
    };

    setHasError(false);
    load();
    const stop = onConnectionRestored(() => {
      if (active) load();
    });
    const stopCache = onBalanceCacheChange(() => {
      if (active) load();
    });

    return () => {
      active = false;
      stop();
      stopCache();
    };
  }, [token, period, attempt]);

  return {
    overview,
    isLoading,
    hasError,
    incomplete,
    retry: () => setAttempt(value => value + 1),
  };
}
