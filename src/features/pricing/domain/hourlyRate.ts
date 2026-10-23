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

type HourlyRateInput = {
  month: MonthPeriod;
  settings: PricingSettings;
  fixedCosts: number;
  variableCosts: number;
  calculatedAt: Date;
};

const WEEKS_IN_A_YEAR = 52;
const MONTHS_IN_A_YEAR = 12;

const roundCents = (value: number) => Math.round(value * 100) / 100;

// A month has 52 / 12 weeks, so 30 h a week give the Figma's 130 h.
export function productiveHoursPerMonth(weeklyHours: number): number {
  return (weeklyHours * WEEKS_IN_A_YEAR) / MONTHS_IN_A_YEAR;
}

// The margin applies to costs plus pró-labore, and both rates divide by the
// unrounded hours so 40 h a week does not drift by a cent.
export function calculateHourlyRate({
  month,
  settings,
  fixedCosts,
  variableCosts,
  calculatedAt,
}: HourlyRateInput): HourlyRate {
  const proLabore = settings.monthlyIncomeGoal;
  const withoutMargin = roundCents(fixedCosts + variableCosts + proLabore);
  const safetyMargin = roundCents(
    (withoutMargin * settings.safetyMarginPct) / 100,
  );
  const total = roundCents(withoutMargin + safetyMargin);
  const hours = productiveHoursPerMonth(settings.weeklyHours);

  return {
    month,
    settings,
    parts: {
      fixedCosts: roundCents(fixedCosts),
      variableCosts: roundCents(variableCosts),
      proLabore,
      safetyMargin,
    },
    total,
    productiveHours: hours,
    hourlyRate: hours > 0 ? roundCents(total / hours) : 0,
    minimumHourlyRate: hours > 0 ? roundCents(withoutMargin / hours) : 0,
    calculatedAt: calculatedAt.toISOString(),
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
