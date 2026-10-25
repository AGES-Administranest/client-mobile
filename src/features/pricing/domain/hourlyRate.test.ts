import {
  calculateHourlyRate,
  percentShares,
  productiveHoursPerMonth,
  shareOfTotal,
} from './hourlyRate';

const OCTOBER = { month: 10, year: 2026 };
const CALCULATED_AT = new Date('2026-10-19T20:42:00.000Z');
const SETTINGS = {
  monthlyIncomeGoal: 8000,
  weeklyHours: 30,
  safetyMarginPct: 20,
};

function calculate(
  overrides: Partial<Parameters<typeof calculateHourlyRate>[0]> = {},
) {
  return calculateHourlyRate({
    month: OCTOBER,
    settings: SETTINGS,
    fixedCosts: 1399.08,
    variableCosts: 1225,
    calculatedAt: CALCULATED_AT,
    ...overrides,
  });
}

test('matches the Figma example for October', () => {
  expect(calculate()).toEqual({
    month: OCTOBER,
    settings: SETTINGS,
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
  });
});

test('recalculates with the costs of another month (the Figma September)', () => {
  const september = calculate({
    month: { month: 9, year: 2026 },
    variableCosts: 980,
  });

  expect(september.parts.safetyMargin).toBe(2075.82);
  expect(september.hourlyRate).toBe(95.81);
  expect(september.minimumHourlyRate).toBe(79.84);
});

it.each([
  [30, 130],
  [40, 173.33],
  [1, 4.33],
  [168, 728],
])('turns %p h a week into %p productive hours a month', (weekly, monthly) => {
  expect(productiveHoursPerMonth(weekly)).toBeCloseTo(monthly, 2);
});

it.each([
  [0, 10624.08, 81.72],
  [100, 21248.16, 163.45],
  [12.5, 11952.09, 91.94],
])(
  'with a %p%% margin the total is %p and the hour %p',
  (margin, total, hourly) => {
    const result = calculate({
      settings: { ...SETTINGS, safetyMarginPct: margin },
    });

    expect(result.total).toBe(total);
    expect(result.hourlyRate).toBe(hourly);
    expect(result.minimumHourlyRate).toBe(81.72);
  },
);

test('a margin of zero makes both rates equal', () => {
  const result = calculate({ settings: { ...SETTINGS, safetyMarginPct: 0 } });

  expect(result.parts.safetyMargin).toBe(0);
  expect(result.hourlyRate).toBe(result.minimumHourlyRate);
});

test('a month with no costs still charges the pró-labore', () => {
  const result = calculate({ fixedCosts: 0, variableCosts: 0 });

  expect(result.total).toBe(9600);
  expect(result.hourlyRate).toBe(73.85);
});

test('divides by the unrounded hours of a 40 h week', () => {
  const result = calculate({
    settings: { ...SETTINGS, weeklyHours: 40, safetyMarginPct: 0 },
    fixedCosts: 0,
    variableCosts: 0,
  });

  expect(result.hourlyRate).toBe(46.15);
});

it.each([
  [1399.08, 12748.9, 0.10974],
  [8000, 12748.9, 0.62751],
  [0, 12748.9, 0],
  [10, 0, 0],
])('%p of %p is a share of %p', (value, total, expected) => {
  expect(shareOfTotal(value, total)).toBeCloseTo(expected, 4);
});

it.each([
  [
    [1399.08, 1225, 8000, 2124.82],
    [11.0, 9.6, 62.7, 16.7],
  ],
  [
    [1399.08, 980, 8000, 2075.82],
    [11.2, 7.9, 64.2, 16.7],
  ],
  [
    [1, 1, 1],
    [33.4, 33.3, 33.3],
  ],
  [
    [0, 0, 8000, 1600],
    [0, 0, 83.3, 16.7],
  ],
  [
    [0, 0],
    [0, 0],
  ],
])('splits %p into shares %p that add up to 100', (values, expected) => {
  const shares = percentShares(values);

  expect(shares).toEqual(expected);
  if (values.some(value => value > 0)) {
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(100, 6);
  }
});
