import type { HourlyRate } from './hourlyRate';

// What GET /pricing/hourly-rate answers for the Figma months, already turned
// into numbers: 8.000 of pró-labore, 30 h a week and a 20% margin.
export const OCTOBER_HOURLY_RATE: HourlyRate = {
  month: { month: 10, year: 2026 },
  settings: { monthlyIncomeGoal: 8000, weeklyHours: 30, safetyMarginPct: 20 },
  parts: {
    fixedCosts: 1399.08,
    variableCosts: 1225,
    proLabore: 8000,
    safetyMargin: 2124.82,
  },
  total: 12748.9,
  productiveHours: 130,
  hourlyRate: 98.07,
  minimumHourlyRate: 81.72,
  calculatedAt: '2026-10-19T20:42:00.000Z',
};

export const SEPTEMBER_HOURLY_RATE: HourlyRate = {
  ...OCTOBER_HOURLY_RATE,
  month: { month: 9, year: 2026 },
  parts: {
    ...OCTOBER_HOURLY_RATE.parts,
    variableCosts: 980,
    safetyMargin: 2075.82,
  },
  total: 12454.9,
  hourlyRate: 95.81,
  minimumHourlyRate: 79.84,
};

// October again after the weekly hours go from 30 to 40.
export const OCTOBER_40_HOURS_HOURLY_RATE: HourlyRate = {
  ...OCTOBER_HOURLY_RATE,
  settings: { ...OCTOBER_HOURLY_RATE.settings, weeklyHours: 40 },
  productiveHours: 173.33,
  hourlyRate: 73.55,
  minimumHourlyRate: 61.29,
};
