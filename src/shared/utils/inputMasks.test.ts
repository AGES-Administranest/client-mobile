import {
  currencyToNumber,
  digitsOnly,
  formatCurrencyInput,
  formatDateInput,
  parseDateInput,
} from './inputMasks';

describe('digitsOnly', () => {
  it('strips letters and symbols, keeping only digits', () => {
    expect(digitsOnly('12a3b')).toBe('123');
    expect(digitsOnly('abc')).toBe('');
    expect(digitsOnly('10,5')).toBe('105');
    expect(digitsOnly('')).toBe('');
  });
});

describe('formatDateInput', () => {
  it('returns empty string when there are no digits', () => {
    expect(formatDateInput('')).toBe('');
    expect(formatDateInput('abc')).toBe('');
  });

  it('inserts slashes as digits are typed', () => {
    expect(formatDateInput('1')).toBe('1');
    expect(formatDateInput('15')).toBe('15');
    expect(formatDateInput('151')).toBe('15/1');
    expect(formatDateInput('1510')).toBe('15/10');
    expect(formatDateInput('15102030')).toBe('15/10/2030');
  });

  it('ignores non-digit characters and extra digits beyond 8', () => {
    expect(formatDateInput('15/10/2030')).toBe('15/10/2030');
    expect(formatDateInput('151020309999')).toBe('15/10/2030');
  });
});

describe('formatCurrencyInput', () => {
  it('returns empty string when there are no digits', () => {
    expect(formatCurrencyInput('')).toBe('');
    expect(formatCurrencyInput('abc')).toBe('');
  });

  it('treats digits as cents, ATM-style', () => {
    expect(formatCurrencyInput('1')).toBe('0,01');
    expect(formatCurrencyInput('12')).toBe('0,12');
    expect(formatCurrencyInput('1200')).toBe('12,00');
  });

  it('adds a thousands separator', () => {
    expect(formatCurrencyInput('123456')).toBe('1.234,56');
  });

  it('ignores non-digit characters in the input', () => {
    expect(formatCurrencyInput('R$ 12,00')).toBe('12,00');
  });
});

describe('currencyToNumber', () => {
  it.each([
    ['10,33', 10.33],
    ['1.234,56', 1234.56],
    ['0,01', 0.01],
    ['', 0],
    ['abc', 0],
  ])('reads %p as %p', (input, expected) => {
    expect(currencyToNumber(input)).toBe(expected);
  });
});

describe('parseDateInput', () => {
  it('reads a complete real date', () => {
    expect(parseDateInput('15/10/2030')).toEqual(new Date(2030, 9, 15));
  });

  it.each(['', '15/10', '15/10/203', '31/02/2030', '00/10/2030', '15/13/2030'])(
    'rejects %p',
    input => {
      expect(parseDateInput(input)).toBeNull();
    },
  );
});
