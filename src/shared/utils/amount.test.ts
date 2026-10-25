import { isPtBrAmount } from './amount';

describe('isPtBrAmount', () => {
  it.each([
    ['1850,00', true],
    ['1850,5', true],
    ['1.850,00', true],
    ['1.234.567,89', true],
    ['1850', true],
    ['1.850', true],
    ['0,01', true],
    ['-10,00', true],
    ['', false],
    ['abc', false],
    ['12,345', false],
    ['1,850.00', false],
    ['1.85', false],
    ['1.8500,00', false],
    ['12a', false],
    ['1850,', false],
    [' 1850,00', false],
  ])('isPtBrAmount(%j) is %s', (text, expected) => {
    expect(isPtBrAmount(text)).toBe(expected);
  });
});
