import { maskAmountInput, parseAmountInput } from './amountInput';

describe('maskAmountInput', () => {
  it.each([
    ['', ''],
    ['0', ''],
    ['5', '0,05'],
    ['18000', '180,00'],
    ['123456', '1.234,56'],
    ['100000000', '1.000.000,00'],
    ['R$ 1.234,56', '1.234,56'],
    ['-5', '0,05'],
    ['abc', ''],
    ['00045', '0,45'],
    ['9999999999999', '9.999.999.999,99'],
  ])('%p -> %p', (typed, masked) => {
    expect(maskAmountInput(typed)).toBe(masked);
  });
});

describe('parseAmountInput', () => {
  it.each([
    ['180,00', 180],
    ['0,05', 0.05],
    ['1.234,56', 1234.56],
    ['1.000.000,00', 1000000],
    ['0,00', 0],
  ])('%p -> %p', (masked, value) => {
    expect(parseAmountInput(masked)).toBe(value);
  });

  it.each(['', 'abc', '2.5', '12.50', '-5,00', '1234,56', '1,5', '1.23,45'])(
    'refuses %p',
    value => {
      expect(parseAmountInput(value)).toBeNull();
    },
  );
});
