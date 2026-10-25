import {
  percentShares,
  shareOfTotal,
  toHourlyRate,
  type HourlyRateResponse,
} from './hourlyRate';
import { OCTOBER_HOURLY_RATE } from './hourlyRate.fixture';

const SETTINGS = OCTOBER_HOURLY_RATE.settings;

// GET /pricing/hourly-rate for the Figma October.
const OCTOBER_RESPONSE: HourlyRateResponse = {
  month: 10,
  year: 2026,
  items: [
    {
      key: 'FIXED_COSTS',
      label: 'Fixed costs',
      amount: '1399.08',
      percentOfTotal: '10.97',
    },
    {
      key: 'VARIABLE_COSTS',
      label: 'Variable costs',
      amount: '1225.00',
      percentOfTotal: '9.61',
    },
    {
      key: 'OWNER_DRAW',
      label: "Owner's draw",
      amount: '8000.00',
      percentOfTotal: '62.75',
    },
    {
      key: 'SAFETY_MARGIN',
      label: 'Safety margin',
      amount: '2124.82',
      percentOfTotal: '16.67',
    },
  ],
  total: '12748.90',
  productiveHours: '130.00',
  hourlyRate: '98.07',
  minimumHourlyRate: '81.72',
  calculatedAt: '2026-10-19T20:42:00.000Z',
};

test('turns the backend answer for the Figma October into numbers', () => {
  expect(toHourlyRate(OCTOBER_RESPONSE, SETTINGS)).toEqual(OCTOBER_HOURLY_RATE);
});

test('finds each part by its key, whatever the order of the items', () => {
  const reversed = {
    ...OCTOBER_RESPONSE,
    items: [...OCTOBER_RESPONSE.items].reverse(),
  };

  expect(toHourlyRate(reversed, SETTINGS).parts).toEqual(
    OCTOBER_HOURLY_RATE.parts,
  );
});

test('refuses an answer without one of the four parts', () => {
  const withoutMargin = {
    ...OCTOBER_RESPONSE,
    items: OCTOBER_RESPONSE.items.filter(item => item.key !== 'SAFETY_MARGIN'),
  };

  expect(() => toHourlyRate(withoutMargin, SETTINGS)).toThrow('safetyMargin');
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
