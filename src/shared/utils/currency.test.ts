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

describe('formatCurrency without cents', () => {
  it.each([
    [2269, 'pt-BR', 'R$ 2.269'],
    [6446.35, 'pt-BR', 'R$ 6.446'],
    [6446.5, 'pt-BR', 'R$ 6.447'],
    [0, 'pt-BR', 'R$ 0'],
    [849.96, 'en-US', 'R$850'],
  ])('formats %p in %s as %s', (value, locale, expected) => {
    expect(normalize(formatCurrency(value, locale, { showCents: false }))).toBe(
      expected,
    );
  });

  it('keeps the cents when the option is explicitly true', () => {
    expect(normalize(formatCurrency(19.9, 'pt-BR', { showCents: true }))).toBe(
      'R$ 19,90',
    );
  });
});
