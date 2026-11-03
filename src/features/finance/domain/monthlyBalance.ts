import type { EntryNature, EntryScope } from './financialEntry';
import type { StatementPeriod } from './statement';

export const EXPENSE_GROUPS = [
  'SUPPLIES',
  'TRAVEL',
  'FIXED_COSTS',
  'DEPRECIATION',
  'TAXES_AND_FEES',
  'OTHER',
] as const;

export type ExpenseGroup = (typeof EXPENSE_GROUPS)[number];

export type EntryStatus = 'PENDING' | 'SETTLED' | 'CANCELED';

export type BalanceEntry = {
  id?: string;
  nature: EntryNature;
  scope: EntryScope;
  amount: number;
  accrualDate: string;
  categoryName: string;
  deletedAt?: string | null;
  pendingSync?: boolean;
  status?: EntryStatus;
};

export type LocalFixedCosts = {
  depreciation: number | null;
};

export type MonthlyBalance = {
  revenue: number;
  professionalExpenses: number;
  personalExpenses: number;
  totalExpenses: number;
  netBalance: number;
  expensesByCategory: { category: ExpenseGroup; subtotal: number }[];
  incomplete: boolean;
};

const GROUP_BY_CATEGORY_NAME: Record<string, ExpenseGroup> = {
  Supplies: 'SUPPLIES',
  Travel: 'TRAVEL',
  'Fixed costs': 'FIXED_COSTS',
  'Taxes and fees': 'TAXES_AND_FEES',
};

function cents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(value: number): number {
  return value / 100;
}

export function accrualMonthBounds(period: StatementPeriod): {
  from: number;
  to: number;
} {
  return {
    from: Date.UTC(period.year, period.month - 1, 1),
    to: Date.UTC(period.year, period.month, 1),
  };
}

function inAccrualMonth(accrualDate: string, period: StatementPeriod): boolean {
  const time = new Date(accrualDate).getTime();
  if (Number.isNaN(time)) return false;
  const bounds = accrualMonthBounds(period);
  return time >= bounds.from && time < bounds.to;
}

function countsInBalance(
  entry: BalanceEntry,
  period: StatementPeriod,
): boolean {
  return !entry.deletedAt && inAccrualMonth(entry.accrualDate, period);
}

function expenseGroup(categoryName: string): ExpenseGroup {
  return GROUP_BY_CATEGORY_NAME[categoryName] ?? 'OTHER';
}

export function calculateMonthlyBalance(
  entries: readonly BalanceEntry[],
  period: StatementPeriod,
  fixedCosts: LocalFixedCosts = { depreciation: null },
): MonthlyBalance {
  let revenue = 0;
  let professional = 0;
  let personal = 0;
  const groups = new Map<ExpenseGroup, number>(
    EXPENSE_GROUPS.map(group => [group, 0]),
  );

  for (const entry of entries) {
    if (!countsInBalance(entry, period)) continue;
    const amount = cents(entry.amount);
    if (entry.nature === 'INCOME') {
      revenue += amount;
      continue;
    }
    if (entry.scope === 'PROFESSIONAL') {
      professional += amount;
    } else {
      personal += amount;
    }
    const group = expenseGroup(entry.categoryName);
    groups.set(group, (groups.get(group) ?? 0) + amount);
  }

  // Trips are already entries (US14), so only the depreciation is added.
  if (fixedCosts.depreciation !== null) {
    const depreciation = cents(fixedCosts.depreciation);
    professional += depreciation;
    groups.set('DEPRECIATION', depreciation);
  }

  const totalExpenses = professional + personal;
  return {
    revenue: fromCents(revenue),
    professionalExpenses: fromCents(professional),
    personalExpenses: fromCents(personal),
    totalExpenses: fromCents(totalExpenses),
    netBalance: fromCents(revenue - totalExpenses),
    expensesByCategory: EXPENSE_GROUPS.map(category => ({
      category,
      subtotal: fromCents(groups.get(category) ?? 0),
    })),
    incomplete: fixedCosts.depreciation === null,
  };
}
