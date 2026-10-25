import type { MonthPeriod } from 'shared/utils/monthPeriod';

import type { PricingSettings } from './pricing.types';

export const HOURLY_RATE_PARTS = [
  'fixedCosts',
  'variableCosts',
  'proLabore',
  'safetyMargin',
] as const;

export type HourlyRatePart = (typeof HOURLY_RATE_PARTS)[number];

export type HourlyRate = {
  month: MonthPeriod;
  settings: PricingSettings;
  parts: Record<HourlyRatePart, number>;
  total: number;
  productiveHours: number;
  hourlyRate: number;
  minimumHourlyRate: number;
  calculatedAt: string;
};

// The parts in the order of `HOURLY_RATE_PARTS`, as GET /pricing/hourly-rate
// names them.
const PART_BY_KEY = {
  FIXED_COSTS: 'fixedCosts',
  VARIABLE_COSTS: 'variableCosts',
  OWNER_DRAW: 'proLabore',
  SAFETY_MARGIN: 'safetyMargin',
} as const satisfies Record<string, HourlyRatePart>;

export type HourlyRatePartKey = keyof typeof PART_BY_KEY;

// GET /pricing/hourly-rate. Every amount comes as a decimal string with 2
// places; `label` is for developers, the app shows its own text per part.
export type HourlyRateResponse = {
  month: number;
  year: number;
  items: {
    key: HourlyRatePartKey;
    label: string;
    amount: string;
    percentOfTotal: string;
  }[];
  total: string;
  productiveHours: string;
  hourlyRate: string;
  minimumHourlyRate: string;
  calculatedAt: string;
};

// The backend does the math (US20); this only turns its strings into numbers.
// `percentOfTotal` is left out: the breakdown shows one decimal, and rounding
// the backend's two decimals again could stop adding up to 100.
export function toHourlyRate(
  response: HourlyRateResponse,
  settings: PricingSettings,
): HourlyRate {
  const amounts = new Map(
    response.items.map(item => [PART_BY_KEY[item.key], Number(item.amount)]),
  );
  const parts = {} as Record<HourlyRatePart, number>;
  for (const part of HOURLY_RATE_PARTS) {
    const amount = amounts.get(part);
    if (amount === undefined) {
      throw new Error(`Hourly rate response without the ${part} part`);
    }
    parts[part] = amount;
  }

  return {
    month: { month: response.month, year: response.year },
    settings,
    parts,
    total: Number(response.total),
    productiveHours: Number(response.productiveHours),
    hourlyRate: Number(response.hourlyRate),
    minimumHourlyRate: Number(response.minimumHourlyRate),
    calculatedAt: response.calculatedAt,
  };
}

export function shareOfTotal(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

// Percentages with one decimal that add up to exactly 100, as the Figma
// shows them (11,0 + 9,6 + 62,7 + 16,7): each share is rounded down and the
// tenths left over go to the largest remainders.
export function percentShares(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return values.map(() => 0);
  }

  const tenths = values.map(value => (value / total) * 1000);
  const shares = tenths.map(Math.floor);
  const leftover = 1000 - shares.reduce((sum, share) => sum + share, 0);
  const byRemainder = tenths
    .map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < leftover; i += 1) {
    shares[byRemainder[i].index] += 1;
  }
  return shares.map(share => share / 10);
}
