import { formatCurrency } from 'shared/utils/currency';

import { currentPeriod, type StatementPeriod } from './statement';

const MINUS = '–';

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
