import { formatSupplyQuantity, formatSupplyTotalCost } from './formatSupply';

const normalize = (value: string) => value.replace(/ /g, ' ');

describe('formatSupplyQuantity', () => {
  it.each([
    [1, 'pt-BR', '1'],
    [0.1, 'pt-BR', '0,1'],
    [0.1, 'en-US', '0.1'],
    [1.23456, 'pt-BR', '1,235'],
  ])('formats %p in %s as %s', (quantity, locale, expected) => {
    expect(formatSupplyQuantity(quantity, locale)).toBe(expected);
  });
});

describe('formatSupplyTotalCost', () => {
  it('shows a non-zero total as a deduction', () => {
    expect(normalize(formatSupplyTotalCost(33.9, 'pt-BR'))).toBe('– R$ 33,90');
  });

  it('shows a zero total without the minus sign', () => {
    expect(normalize(formatSupplyTotalCost(0, 'pt-BR'))).toBe('R$ 0,00');
  });

  it('rounds floating-point noise from the sum to cents', () => {
    expect(normalize(formatSupplyTotalCost(19.9 + 2.8 + 11.2, 'pt-BR'))).toBe(
      '– R$ 33,90',
    );
  });
});
