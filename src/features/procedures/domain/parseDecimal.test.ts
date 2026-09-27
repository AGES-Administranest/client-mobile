import { parseDecimal } from './parseDecimal';

describe('parseDecimal', () => {
  it.each([
    ['12', 12],
    ['12.5', 12.5],
    ['12,5', 12.5],
    ['  7 ', 7],
    ['0', 0],
    ['-3', -3],
  ])('converte "%s" em %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '1,2,3', 'Infinity'])(
    'retorna null para "%s"',
    input => {
      expect(parseDecimal(input)).toBeNull();
    },
  );
});
