import type { MonthPeriod } from 'shared/utils/monthPeriod';

import type { HourlyRateResponse } from './hourlyRate';

export const HISTORY_WINDOW_SIZE = 6;

// One item of GET /pricing/hourly-rate/history, newest month first: the hour
// value stored for the month and, derived from the same row, the productive
// hours and the minimum (without the margin) of the month's own route.
// Decimals come as strings.
export type HourlyRateHistoryItem = {
  year: number;
  month: number;
  hourlyRate: string;
  productiveHours: string;
  minimumHourlyRate: string;
  calculatedAt: string;
};

export type HourlyRateHistoryResponse = HourlyRateHistoryItem[];

// GET /pricing/hourly-rate/history/:year/:month: the month in the shape of
// GET /pricing/hourly-rate, plus the goals it was calculated with.
export type HourlyRateHistoryMonthResponse = HourlyRateResponse & {
  parameters: {
    monthlyIncomeGoal: string;
    weeklyHours: string;
    safetyMarginPct: string;
  };
};

// What the list needs of a month. The parts and the goals are the month
// detail's (GET /pricing/hourly-rate/history/:year/:month), not the list's.
export type HourlyRatePeriod = {
  month: MonthPeriod;
  hourlyRate: number;
  productiveHours: number;
  minimumHourlyRate: number;
  calculatedAt: string;
};

export type HourlyRateHistoryRow = {
  rate: HourlyRatePeriod;
  // Percent against the previous month on record, which is not always the
  // previous calendar month. `null` for the oldest month and when there is
  // nothing to compare against.
  variation: number | null;
  isOldest: boolean;
};

export type HourlyRateYearGroup = {
  year: number;
  rows: HourlyRateHistoryRow[];
};

export type HourlyRateSinceStart = {
  from: HourlyRatePeriod;
  to: HourlyRatePeriod;
  difference: number;
  percent: number;
};

export function toHourlyRateHistory(
  response: HourlyRateHistoryResponse,
): HourlyRatePeriod[] {
  return response.map(item => ({
    month: { month: item.month, year: item.year },
    hourlyRate: Number(item.hourlyRate),
    productiveHours: Number(item.productiveHours),
    minimumHourlyRate: Number(item.minimumHourlyRate),
    calculatedAt: item.calculatedAt,
  }));
}

export function monthKey({ month, year }: MonthPeriod): string {
  return `${year}-${month}`;
}

function monthIndex({ month, year }: MonthPeriod): number {
  return year * 12 + month;
}

export function percentChange(from: number, to: number): number | null {
  return from > 0 ? ((to - from) / from) * 100 : null;
}

// Newest month first, each row compared with the next one in the list, which
// is the previous month that has a calculation. Months without one are
// skipped, not read as zero.
export function buildHistoryRows(
  history: HourlyRatePeriod[],
): HourlyRateHistoryRow[] {
  const newestFirst = [...history].sort(
    (a, b) => monthIndex(b.month) - monthIndex(a.month),
  );

  return newestFirst.map((rate, index) => {
    const previous = newestFirst[index + 1];
    return {
      rate,
      variation: previous
        ? percentChange(previous.hourlyRate, rate.hourlyRate)
        : null,
      isOldest: !previous,
    };
  });
}

// Windows count records, not calendar months: a gap in the history does not
// leave a window short.
export function splitIntoWindows<T>(
  items: readonly T[],
  size = HISTORY_WINDOW_SIZE,
): T[][] {
  const windows: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    windows.push(items.slice(start, start + size));
  }
  return windows;
}

export function summarizeSinceStart(
  rows: readonly HourlyRateHistoryRow[],
): HourlyRateSinceStart | null {
  if (rows.length < 2) return null;

  const from = rows[rows.length - 1].rate;
  const to = rows[0].rate;
  return {
    from,
    to,
    difference: to.hourlyRate - from.hourlyRate,
    percent: percentChange(from.hourlyRate, to.hourlyRate) ?? 0,
  };
}

export function groupByYear(
  rows: readonly HourlyRateHistoryRow[],
): HourlyRateYearGroup[] {
  const groups: HourlyRateYearGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.year === row.rate.month.year) {
      last.rows.push(row);
    } else {
      groups.push({ year: row.rate.month.year, rows: [row] });
    }
  }
  return groups;
}
