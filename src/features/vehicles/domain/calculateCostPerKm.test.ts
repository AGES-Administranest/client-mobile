import { calculateCostPerKm } from './calculateCostPerKm';

describe('calculateCostPerKm', () => {
  it('calculates cost per km with numeric inputs', () => {
    const result = calculateCostPerKm(5.899, 12.5);
    expect(result).toBeCloseTo(0.47192, 4);
  });

  it('calculates cost per km with string inputs using dot or comma', () => {
    expect(calculateCostPerKm('5.899', '12.5')).toBeCloseTo(0.47192, 4);
    expect(calculateCostPerKm('5,899', '12,5')).toBeCloseTo(0.47192, 4);
  });

  it('returns null for zero or negative values', () => {
    expect(calculateCostPerKm(0, 10)).toBeNull();
    expect(calculateCostPerKm(5, 0)).toBeNull();
    expect(calculateCostPerKm(-5, 10)).toBeNull();
    expect(calculateCostPerKm(5, -10)).toBeNull();
  });

  it('returns null for null, undefined, empty, or invalid inputs', () => {
    expect(calculateCostPerKm(null, 10)).toBeNull();
    expect(calculateCostPerKm(5, undefined)).toBeNull();
    expect(calculateCostPerKm('', '10')).toBeNull();
    expect(calculateCostPerKm('abc', '10')).toBeNull();
    expect(calculateCostPerKm('5', 'xyz')).toBeNull();
  });
});
