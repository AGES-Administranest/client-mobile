import {
  formatAmountInput,
  maskCurrencyInput,
  parseCurrencyInput,
  validateTransportCost,
} from './fixedCostsSummary';

describe('maskCurrencyInput', () => {
  it.each([
    ['', ''],
    ['abc', ''],
    ['0', '0,00'],
    ['000', '0,00'],
    ['5', '0,05'],
    ['35', '0,35'],
    ['350', '3,50'],
    ['35000', '350,00'],
    ['122500', '1.225,00'],
    ['R$ 1.225,00', '1.225,00'],
    ['00012', '0,12'],
    ['-', '-'],
    ['-500', '-5,00'],
  ])('masks %p as %p', (input, expected) => {
    expect(maskCurrencyInput(input)).toBe(expected);
  });

  describe('limit of 14 digits (decimal(14,2))', () => {
    it.each([
      ['99999999999999', '999.999.999.999,99'],
      ['11111111111111', '111.111.111.111,11'],
      ['11111111111111111111', '111.111.111.111,11'],
      ['999.999.999.999,991', '999.999.999.999,99'],
      ['-11111111111111111111', '-111.111.111.111,11'],
      ['0000011111111111111', '111.111.111.111,11'],
    ])('masks %p as %p', (input, expected) => {
      expect(maskCurrencyInput(input)).toBe(expected);
    });

    it('is stable when the masked maximum is masked again', () => {
      const masked = maskCurrencyInput('99999999999999');

      expect(maskCurrencyInput(masked)).toBe(masked);
    });
  });
});

describe('formatAmountInput', () => {
  it.each([
    [350, '350,00'],
    [1225, '1.225,00'],
    [189.08, '189,08'],
    [0.5, '0,50'],
  ])('formats %p as %p', (amount, expected) => {
    expect(formatAmountInput(amount)).toBe(expected);
  });

  it('formats zero as 0,00', () => {
    expect(formatAmountInput(0)).toBe('0,00');
  });

  it('round-trips the maximum value without losing precision', () => {
    const maximum = 999999999999.99;
    const formatted = formatAmountInput(maximum);

    expect(formatted).toBe('999.999.999.999,99');
    expect(parseCurrencyInput(formatted)).toBe(maximum);
  });

  it('round-trips a value typed past the limit as the truncated amount', () => {
    const typed = maskCurrencyInput('11111111111111111111');

    expect(parseCurrencyInput(typed)).toBe(111111111111.11);
    expect(formatAmountInput(111111111111.11)).toBe(typed);
  });
});

describe('parseCurrencyInput', () => {
  it.each([
    ['350,00', 350],
    ['1.225,00', 1225],
    ['0,05', 0.05],
    ['-5,00', -5],
    ['', null],
    ['   ', null],
    ['abc', null],
    ['-', null],
  ])('parses %p as %p', (input, expected) => {
    expect(parseCurrencyInput(input)).toBe(expected);
  });
});

describe('validateTransportCost', () => {
  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['abc', 'notNumeric'],
    ['-', 'notNumeric'],
    ['-5,00', 'negative'],
    ['0,00', null],
    ['0', null],
    ['350,00', null],
    ['1.225,00', null],
  ])('validates %p as %p', (input, expected) => {
    expect(validateTransportCost(input)).toBe(expected);
  });
});
