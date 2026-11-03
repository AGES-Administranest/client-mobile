import { formatCurrency } from 'shared/utils/currency';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import type { EntryScope, FinancialEntry } from './financialEntry';

export type StatementScope = 'all' | EntryScope;

export type StatementPeriod = { month: number; year: number };

export type StatementFilters = {
  period: StatementPeriod;
  scope: StatementScope;
};

export const STATEMENT_SCOPES: readonly StatementScope[] = [
  'all',
  'PROFESSIONAL',
  'PERSONAL',
];

// O mesmo limite padrão do GET /financial-entries: uma página menor que ele é
// a última, porque a API não devolve o total.
export const STATEMENT_PAGE_SIZE = 50;

export function currentPeriod(today: Date): StatementPeriod {
  return { month: today.getMonth() + 1, year: today.getFullYear() };
}

export function toStatementQuery(
  { period, scope }: StatementFilters,
  page: number,
): string {
  const query = new URLSearchParams({
    month: String(period.month),
    year: String(period.year),
    page: String(page),
    limit: String(STATEMENT_PAGE_SIZE),
  });
  if (scope !== 'all') {
    query.set('scope', scope);
  }
  return query.toString();
}

export function isLastStatementPage(page: readonly unknown[]): boolean {
  return page.length < STATEMENT_PAGE_SIZE;
}

export function appendStatementPage(
  entries: readonly FinancialEntry[],
  page: readonly FinancialEntry[],
): FinancialEntry[] {
  const known = new Set(entries.map(entry => entry.id));
  return [...entries, ...page.filter(entry => !known.has(entry.id))];
}

export function isAutomaticEntry(
  entry: Pick<FinancialEntry, 'source'>,
): boolean {
  return entry.source !== 'MANUAL';
}

export function formatSignedAmount(
  entry: Pick<FinancialEntry, 'nature' | 'amount'>,
  locale: string,
): string {
  const sign = entry.nature === 'INCOME' ? '+' : '–';
  const showCents = !Number.isInteger(entry.amount);
  return `${sign}${formatCurrency(entry.amount, locale, { showCents })}`;
}

export function formatStatementDate(
  accrualDate: string,
  locale: string,
): string {
  const date = new Date(accrualDate);
  return formatDayAndMonth(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    locale,
  );
}
