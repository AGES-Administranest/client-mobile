import { formatCurrency } from './currency';

const normalize = (value: string) => value.replace(/ /g, ' ');

describe('formatCurrency', () => {
  it.each([
    [19.9, 'pt-BR', 'R$ 19,90'],
    [0, 'pt-BR', 'R$ 0,00'],
    [1234.5, 'pt-BR', 'R$ 1.234,50'],
    [1234.5, 'en-US', 'R$1,234.50'],
    [33.900000000000006, 'pt-BR', 'R$ 33,90'],
  ])('formats %p in %s as %s', (value, locale, expected) => {
    expect(normalize(formatCurrency(value, locale))).toBe(expected);
  });
});
