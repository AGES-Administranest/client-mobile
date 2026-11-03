import { formatOverviewAmount } from './overview';

const normalize = (value: string) => value.replace(/ /g, ' ');

describe('formatOverviewAmount', () => {
  it.each([
    [0, 'R$ 0,00'],
    [620, 'R$ 620'],
    [1400, 'R$ 1.400'],
    [10.1, 'R$ 10,10'],
    [189.08, 'R$ 189,08'],
    [0.5, 'R$ 0,50'],
    [-80, '–R$ 80'],
    [-189.08, '–R$ 189,08'],
    [-0.5, '–R$ 0,50'],
  ] as const)('%d reads %s', (value, expected) => {
    expect(normalize(formatOverviewAmount(value, 'pt-BR'))).toBe(expected);
  });

  it('follows the locale', () => {
    expect(normalize(formatOverviewAmount(1400, 'en-US'))).toBe('R$1,400');
    expect(normalize(formatOverviewAmount(-10.5, 'en-US'))).toBe('–R$10.50');
  });
});
