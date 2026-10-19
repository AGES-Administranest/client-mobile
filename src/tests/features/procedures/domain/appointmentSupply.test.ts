import {
  grossMargin,
  toSupplyItem,
} from 'features/procedures/domain/appointmentSupply';

describe('toSupplyItem', () => {
  it('turns the saved movement into a list item, keyed by the movement id', () => {
    expect(
      toSupplyItem({
        id: 'movement-1',
        quantity: '0.500',
        unitCost: '42.3000',
        item: { name: 'Cetamina 50mg/ml' },
      }),
    ).toEqual({
      id: 'movement-1',
      name: 'Cetamina 50mg/ml',
      quantity: 0.5,
      unitCost: 42.3,
    });
  });
});

describe('grossMargin', () => {
  it('subtracts the supplies from the billed amount', () => {
    expect(grossMargin('350.00', 85.35)).toBeCloseTo(264.65);
  });

  it('can go negative when the supplies cost more than was billed', () => {
    expect(grossMargin('10.00', 25)).toBe(-15);
  });

  it('has nothing to show without a billed amount', () => {
    expect(grossMargin(null, 33.9)).toBeNull();
  });
});
