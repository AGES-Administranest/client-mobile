import { validateAmountInput } from './validateAmount';

describe('validateAmountInput', () => {
  it.each([
    ['', 'REQUIRED'],
    ['   ', 'REQUIRED'],
    ['abc', 'INVALID_NUMBER'],
    ['-5', 'MUST_BE_POSITIVE'],
    ['0', 'MUST_BE_POSITIVE'],
    ['0,00', 'MUST_BE_POSITIVE'],
    ['10,555', 'MAX_2_DECIMALS'],
    ['10.555', 'MAX_2_DECIMALS'],
    ['0,5', null],
    ['350,50', null],
    ['10', null],
  ])('"%s" -> %s', (raw, expected) => {
    expect(validateAmountInput(raw)).toBe(expected);
  });
});
