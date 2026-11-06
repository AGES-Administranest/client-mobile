import type {
  HourlyRateHistoryResponse,
  HourlyRatePeriod,
} from './hourlyRateHistory';

// What GET /pricing/hourly-rate/history answers for the twelve Figma months,
// from October 2026 back to November 2025: fixed months, so no test depends
// on the day it runs.
const FIGMA_MONTHS = [
  [2026, 10, '98.07'],
  [2026, 9, '95.81'],
  [2026, 8, '92.30'],
  [2026, 7, '93.60'],
  [2026, 6, '90.15'],
  [2026, 5, '88.40'],
  [2026, 4, '86.95'],
  [2026, 3, '85.10'],
  [2026, 2, '82.75'],
  [2026, 1, '83.40'],
  [2025, 12, '81.90'],
  [2025, 11, '80.20'],
] as const;

export const HISTORY_RESPONSE: HourlyRateHistoryResponse = FIGMA_MONTHS.map(
  ([year, month, hourlyRate]) => ({
    year,
    month,
    hourlyRate,
    calculatedAt: new Date(Date.UTC(year, month - 1, 19, 20, 42)).toISOString(),
  }),
);

// The same months as the app reads them, newest first.
export const HISTORY_PERIODS: HourlyRatePeriod[] = HISTORY_RESPONSE.map(
  item => ({
    month: { month: item.month, year: item.year },
    hourlyRate: Number(item.hourlyRate),
    calculatedAt: item.calculatedAt,
  }),
);

// The newest `count` months.
export const newestPeriods = (count: number) => HISTORY_PERIODS.slice(0, count);
