import { calculateTravelTotalCost } from './travelCost';

describe('calculateTravelTotalCost', () => {
  it('sums costs that arrive as text or as numbers', () => {
    expect(
      calculateTravelTotalCost([{ cost: '12.50' }, { cost: 7.5 }]),
    ).toBeCloseTo(20);
  });

  it('is zero without trips and skips a cost that is not a number', () => {
    expect(calculateTravelTotalCost([])).toBe(0);
    expect(calculateTravelTotalCost([{ cost: 'abc' }, { cost: '4' }])).toBe(4);
  });
});
