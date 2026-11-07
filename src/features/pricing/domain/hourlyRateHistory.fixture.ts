import type {
  HourlyRateHistoryResponse,
  HourlyRatePeriod,
} from './hourlyRateHistory';

// What GET /pricing/hourly-rate/history answers for the twelve Figma months,
// from October 2026 back to November 2025: fixed months, so no test depends
// on the day it runs. Each one is [year, month, hour value, productive hours,
// minimum].
const FIGMA_MONTHS = [
  [2026, 10, '98.07', '130.00', '81.72'],
  [2026, 9, '95.81', '130.00', '79.84'],
  [2026, 8, '92.30', '134.00', '76.92'],
  [2026, 7, '93.60', '128.00', '78.00'],
  [2026, 6, '90.15', '132.00', '75.13'],
  [2026, 5, '88.40', '136.00', '73.67'],
  [2026, 4, '86.95', '132.00', '72.46'],
  [2026, 3, '85.10', '136.00', '70.92'],
  [2026, 2, '82.75', '134.00', '68.96'],
  [2026, 1, '83.40', '126.00', '69.50'],
  [2025, 12, '81.90', '120.00', '68.25'],
  [2025, 11, '80.20', '138.00', '66.83'],
] as const;

export const HISTORY_RESPONSE: HourlyRateHistoryResponse = FIGMA_MONTHS.map(
  ([year, month, hourlyRate, productiveHours, minimumHourlyRate]) => ({
    year,
    month,
    hourlyRate,
    productiveHours,
    minimumHourlyRate,
    calculatedAt: new Date(Date.UTC(year, month - 1, 19, 20, 42)).toISOString(),
  }),
);

// The same months as the app reads them, newest first.
export const HISTORY_PERIODS: HourlyRatePeriod[] = HISTORY_RESPONSE.map(
  item => ({
    month: { month: item.month, year: item.year },
    hourlyRate: Number(item.hourlyRate),
    productiveHours: Number(item.productiveHours),
    minimumHourlyRate: Number(item.minimumHourlyRate),
    calculatedAt: item.calculatedAt,
  }),
);

// The newest `count` months.
export const newestPeriods = (count: number) => HISTORY_PERIODS.slice(0, count);
