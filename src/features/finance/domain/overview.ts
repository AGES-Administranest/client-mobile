import { formatCurrency } from 'shared/utils/currency';

import type { FinancialEntry } from './financialEntry';
import { currentPeriod, type StatementPeriod } from './statement';

const MINUS = '–';

export type PeriodTotals = {
  revenue: number;
  professionalExpenses: number;
  personalExpenses: number;
  netBalance: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasCents(value: number): boolean {
  return Math.round(Math.abs(value) * 100) % 100 !== 0;
}

export function shiftPeriod(
  period: StatementPeriod,
  offset: number,
): StatementPeriod {
  return currentPeriod(new Date(period.year, period.month - 1 + offset, 1));
}

export function isCurrentPeriod(period: StatementPeriod, today: Date): boolean {
  const current = currentPeriod(today);
  return period.month === current.month && period.year === current.year;
}

export function formatPeriodLabel(
  period: StatementPeriod,
  monthName: string,
): string {
  return `${monthName} ${period.year}`;
}

export function formatOverviewAmount(value: number, locale: string): string {
  const rounded = roundMoney(value);
  const formatted = formatCurrency(Math.abs(rounded), locale, {
    showCents: rounded === 0 || hasCents(rounded),
  });
  return rounded < 0 ? `${MINUS}${formatted}` : formatted;
}

export function summarizePeriod(
  entries: readonly Pick<FinancialEntry, 'nature' | 'scope' | 'amount'>[],
): PeriodTotals {
  let revenue = 0;
  let professionalExpenses = 0;
  let personalExpenses = 0;

  for (const entry of entries) {
    if (entry.nature === 'INCOME') {
      revenue = roundMoney(revenue + entry.amount);
    } else if (entry.scope === 'PROFESSIONAL') {
      professionalExpenses = roundMoney(professionalExpenses + entry.amount);
    } else {
      personalExpenses = roundMoney(personalExpenses + entry.amount);
    }
  }

  return {
    revenue,
    professionalExpenses,
    personalExpenses,
    netBalance: roundMoney(revenue - professionalExpenses - personalExpenses),
  };
}
