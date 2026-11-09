import type { FinancialEntry } from '../domain/financialEntry';
import type { StatementPeriod } from '../domain/statement';

export type CachedMonth = {
  entries: FinancialEntry[];
  pending: FinancialEntry[];
  depreciation: number | null;
};

const months = new Map<string, CachedMonth>();
const listeners = new Set<() => void>();

function key(period: StatementPeriod): string {
  return `${period.year}-${period.month}`;
}

function empty(): CachedMonth {
  return {
    entries: [],
    pending: [],
    depreciation: null,
  };
}

function read(period: StatementPeriod): CachedMonth {
  return months.get(key(period)) ?? empty();
}

function emit(): void {
  listeners.forEach(listener => listener());
}

export function onBalanceCacheChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readBalanceCache(period: StatementPeriod): CachedMonth {
  const cached = read(period);
  return {
    ...cached,
    entries: [...cached.entries],
    pending: [...cached.pending],
  };
}

export function entriesFromCache(cached: CachedMonth): FinancialEntry[] {
  const known = new Set(cached.entries.map(entry => entry.id));
  return [
    ...cached.entries,
    ...cached.pending.filter(entry => !known.has(entry.id)),
  ];
}

export function saveBalanceEntries(
  period: StatementPeriod,
  entries: readonly FinancialEntry[],
): void {
  const current = read(period);
  months.set(key(period), { ...current, entries: [...entries] });
}

export function rememberPendingEntry(
  period: StatementPeriod,
  entry: FinancialEntry,
): void {
  const current = read(period);
  const pending = current.pending.filter(saved => saved.id !== entry.id);
  months.set(key(period), {
    ...current,
    pending: [...pending, { ...entry, pendingSync: true }],
  });
  emit();
}

export function saveBalanceAdjustments(
  period: StatementPeriod,
  adjustments: { depreciation?: number | null },
): void {
  const current = read(period);
  months.set(key(period), {
    ...current,
    depreciation: adjustments.depreciation ?? current.depreciation,
  });
}

export function clearBalanceCache(): void {
  months.clear();
}
