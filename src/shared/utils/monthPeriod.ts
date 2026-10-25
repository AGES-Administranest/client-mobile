export type MonthPeriod = { month: number; year: number };

export type RelativeMonth = 'current' | 'previous' | 'next';

export function monthOf(date: Date): MonthPeriod {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function shiftMonth(period: MonthPeriod, offset: number): MonthPeriod {
  return monthOf(new Date(period.year, period.month - 1 + offset, 1));
}

export function relativeMonth(
  period: MonthPeriod,
  today: Date,
): RelativeMonth | null {
  const current = monthOf(today);
  const distance =
    (period.year - current.year) * 12 + (period.month - current.month);

  if (distance === 0) return 'current';
  if (distance === -1) return 'previous';
  if (distance === 1) return 'next';
  return null;
}

// "Outubro 2026", as the month selector draws it: `toLocaleDateString` with
// month and year would give "outubro de 2026" in pt-BR.
export function formatMonthLabel(period: MonthPeriod, locale: string): string {
  const monthName = new Date(
    period.year,
    period.month - 1,
    1,
  ).toLocaleDateString(locale, { month: 'long' });

  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${
    period.year
  }`;
}
