import { locales, type Locale } from 'shared/i18n/locales';
import { translate } from 'shared/i18n/translate';

import {
  formatNumber,
  longMonthName,
  monthCaption,
  type Format,
} from './presenterCommon';

const formatFor = (locale: Locale): Format => ({
  locale,
  t: ((key, params) => translate(locales[locale], key, params)) as Format['t'],
});

describe('monthCaption', () => {
  // Nothing in it reads today's date: the same month always gives the same text.
  it.each([
    [{ month: 9, year: 2026 }, 'Valores de setembro/2026'],
    [{ month: 12, year: 2025 }, 'Valores de dezembro/2025'],
    [{ month: 3, year: 2026 }, 'Valores de março/2026'],
    [{ month: 10, year: 2026 }, 'Valores de outubro/2026'],
  ] as const)('%j reads %s in pt-BR', (period, expected) => {
    expect(monthCaption(period, formatFor('pt-BR'))).toBe(expected);
  });

  // English writes the months with a capital, wherever they are in the text.
  it.each([
    [{ month: 9, year: 2026 }, 'Values for September/2026'],
    [{ month: 12, year: 2025 }, 'Values for December/2025'],
    [{ month: 3, year: 2026 }, 'Values for March/2026'],
  ] as const)('%j reads %s in en-US', (period, expected) => {
    expect(monthCaption(period, formatFor('en-US'))).toBe(expected);
  });
});

describe('longMonthName', () => {
  it.each([
    ['pt-BR', { month: 5, year: 2026 }, 'maio'],
    ['pt-BR', { month: 10, year: 2026 }, 'outubro'],
    // Always lowercase: the chart's labels write "vs september".
    ['en-US', { month: 9, year: 2026 }, 'september'],
  ] as const)('%s %j is %s', (locale, period, expected) => {
    expect(longMonthName(period, locale)).toBe(expected);
  });
});

describe('formatNumber', () => {
  it.each([
    [130, 'pt-BR', 1, '130'],
    [173.333, 'pt-BR', 1, '173,3'],
    [15.5, 'pt-BR', 2, '15,5'],
    [20, 'pt-BR', 2, '20'],
    [1234.5, 'pt-BR', 2, '1.234,5'],
    [1234.5, 'en-US', 2, '1,234.5'],
  ] as const)(
    '%p in %s with up to %p decimals is %s',
    (value, locale, digits, expected) => {
      expect(formatNumber(value, locale, digits)).toBe(expected);
    },
  );
});
