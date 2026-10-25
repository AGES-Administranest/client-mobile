import { calculateTripCost } from './calculateTripCost';

describe('calculateTripCost', () => {
  it('calculates OWN_VEHICLE cost as distanceKm * costPerKm rounded to 2 decimals', () => {
    const cost = calculateTripCost({
      mode: 'OWN_VEHICLE',
      distanceKm: 30,
      costPerKm: 0.4719,
    });
    expect(cost).toBe(14.16);
  });

  it('calculates OWN_VEHICLE cost with string inputs using dot or comma', () => {
    const costDot = calculateTripCost({
      mode: 'OWN_VEHICLE',
      distanceKm: '32.5',
      costPerKm: '0.4719',
    });
    expect(costDot).toBe(15.34);

    const costComma = calculateTripCost({
      mode: 'OWN_VEHICLE',
      distanceKm: '32,5',
      costPerKm: '0,4719',
    });
    expect(costComma).toBe(15.34);
  });

  it('handles RIDE mode by returning the fare paid', () => {
    const costNum = calculateTripCost({
      mode: 'RIDE',
      cost: 45.5,
    });
    expect(costNum).toBe(45.5);

    const costStr = calculateTripCost({
      mode: 'RIDE',
      cost: '32,90',
    });
    expect(costStr).toBe(32.9);
  });

  it('returns 0 for negative, null or invalid inputs', () => {
    expect(
      calculateTripCost({
        mode: 'OWN_VEHICLE',
        distanceKm: -10,
        costPerKm: 0.5,
      }),
    ).toBe(0);

    expect(
      calculateTripCost({
        mode: 'OWN_VEHICLE',
        distanceKm: null,
        costPerKm: 0.5,
      }),
    ).toBe(0);

    expect(
      calculateTripCost({
        mode: 'RIDE',
        cost: -20,
      }),
    ).toBe(0);

    expect(
      calculateTripCost({
        mode: 'RIDE',
        cost: 'invalid',
      }),
    ).toBe(0);
  });
});
