import type { FixedCost } from './fixedCost';
import {
  countActiveFixedCosts,
  sumActiveMonthlyAmount,
} from './fixedCostSummary';

function makeFixedCost(overrides: Partial<FixedCost> = {}): FixedCost {
  return {
    id: 'fc-1',
    description: 'Aluguel',
    category: 'RENT',
    monthlyAmount: 100,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sumActiveMonthlyAmount', () => {
  it.each([
    ['empty list', [], 0],
    [
      'only active items',
      [
        makeFixedCost({ monthlyAmount: 100 }),
        makeFixedCost({ monthlyAmount: 50 }),
      ],
      150,
    ],
    [
      'ignores inactive items',
      [
        makeFixedCost({ monthlyAmount: 100, active: true }),
        makeFixedCost({ monthlyAmount: 9999, active: false }),
      ],
      100,
    ],
    [
      'all items inactive',
      [makeFixedCost({ monthlyAmount: 100, active: false })],
      0,
    ],
  ])('%s', (_label, fixedCosts, expected) => {
    expect(sumActiveMonthlyAmount(fixedCosts)).toBe(expected);
  });
});

describe('countActiveFixedCosts', () => {
  it('counts only active items', () => {
    const fixedCosts = [
      makeFixedCost({ active: true }),
      makeFixedCost({ active: true }),
      makeFixedCost({ active: false }),
    ];

    expect(countActiveFixedCosts(fixedCosts)).toBe(2);
  });
});
