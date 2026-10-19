import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { fetchFixedCostsSummary } from 'features/calculator';
import { equipmentService } from 'features/equipment';
import {
  calculateHoursWorked,
  fetchAppointments,
  type AppointmentResult,
} from 'features/procedures';

import type { StatementPeriod } from '../domain/statement';
import { fetchAllMonthlyFinancialEntries } from '../services/financialEntryService';

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

export function useFinanceOverview(
  period: StatementPeriod,
): FinanceOverviewState {
  const { session } = useAuth();
  const token = session?.idToken;
  const { month, year } = period;
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    if (!token) {
      setOverview(null);
      setHasError(true);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    Promise.all([
      fetchFixedCostsSummary(token, { month, year }),
      fetchAllMonthlyFinancialEntries(token, { month, year }),
      fetchAllCompletedAppointments(token, { month, year }),
      equipmentService.summary(token),
    ])
      .then(([costs, entries, appointments, equipment]) => {
        if (!active) return;
        const revenue = entries
          .filter(entry => entry.nature === 'INCOME')
          .reduce((sum, entry) => sum + entry.amount, 0);
        const work = appointments.reduce(
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
        setOverview({
          revenue,
          professionalExpenses: costs.professionalExpenses,
          personalExpenses: costs.personalExpenses,
          netBalance:
            revenue - costs.professionalExpenses - costs.personalExpenses,
          hoursWorked,
          averageHourly: hoursWorked > 0 ? work.billed / hoursWorked : null,
          depreciation: costs.equipmentDepreciation,
          equipmentCount: equipment.count,
        });
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, month, year, attempt]);

  return {
    overview,
    isLoading,
    hasError,
    retry: () => setAttempt(value => value + 1),
  };
}
