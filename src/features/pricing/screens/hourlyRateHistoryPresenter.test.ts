import { locales, type Locale } from 'shared/i18n/locales';
import { translate } from 'shared/i18n/translate';

import {
  formatChange,
  formatSignedCurrency,
  windowRange,
} from './hourlyRateHistoryPresenter';
import {
  buildHistoryRows,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';
import { HISTORY_PERIODS } from '../domain/hourlyRateHistory.fixture';

const formatFor = (locale: Locale) => ({
  locale,
  t: ((key, params) => translate(locales[locale], key, params)) as Parameters<
    typeof windowRange
  >[1]['t'],
});

// Currency comes with a no-break space after the symbol.
const plain = (value: string) => value.replace(/ /g, ' ');

// Rows newest first, as the screen hands them over.
const rowsFor = (...months: [number, number][]): HourlyRateHistoryRow[] =>
  buildHistoryRows(
    months.map(([year, month]) => ({
      ...HISTORY_PERIODS[0],
      month: { month, year },
    })),
  );

describe('formatChange', () => {
  it.each([
    ['a rise', 2.36, 'pt-BR', { tone: 'up', label: '+2,4%' }],
    ['a rise in en-US', 2.36, 'en-US', { tone: 'up', label: '+2.4%' }],
    [
      'a drop, with the unicode minus',
      -1.4,
      'pt-BR',
      { tone: 'down', label: '−1,4%' },
    ],
    ['a drop in en-US', -1.4, 'en-US', { tone: 'down', label: '−1.4%' }],
    [
      'a rise that rounds to zero',
      0.04,
      'pt-BR',
      { tone: 'flat', label: '0,0%' },
    ],
    [
      'a drop that rounds to zero, with no sign',
      -0.04,
      'pt-BR',
      { tone: 'flat', label: '0,0%' },
    ],
    ['exactly zero', 0, 'pt-BR', { tone: 'flat', label: '0,0%' }],
    [
      'rounding up to one decimal',
      2.36,
      'pt-BR',
      { tone: 'up', label: '+2,4%' },
    ],
    [
      'rounding down to one decimal',
      2.34,
      'pt-BR',
      { tone: 'up', label: '+2,3%' },
    ],
    [
      'the first value that is not zero',
      0.05,
      'pt-BR',
      { tone: 'up', label: '+0,1%' },
    ],
    ['a whole number', 10, 'pt-BR', { tone: 'up', label: '+10,0%' }],
  ])('%s: %s in %s', (_name, percent, locale, expected) => {
    expect(formatChange(percent, locale)).toEqual(expected);
  });

  it('never prints a minus sign next to a flat value', () => {
    expect(formatChange(-0.01, 'pt-BR').label).not.toContain('−');
  });
});

describe('formatSignedCurrency', () => {
  it.each([
    ['a positive value', 17.87, 'pt-BR', '+R$ 17,87'],
    ['a negative value, with the unicode minus', -10, 'pt-BR', '−R$ 10,00'],
    ['zero', 0, 'pt-BR', 'R$ 0,00'],
    ['less than a cent, which reads as zero', 0.004, 'pt-BR', 'R$ 0,00'],
    ['a positive value in en-US', 17.87, 'en-US', '+R$17.87'],
    ['a negative value in en-US', -10, 'en-US', '−R$10.00'],
  ])('%s: %s in %s', (_name, value, locale, expected) => {
    expect(plain(formatSignedCurrency(value, locale))).toBe(expected);
  });
});

describe('windowRange', () => {
  it.each([
    [
      'a window inside one year',
      [
        [2026, 10],
        [2026, 9],
        [2026, 8],
        [2026, 7],
        [2026, 6],
        [2026, 5],
      ],
      'pt-BR',
      'Mai – Out 2026',
    ],
    [
      'a window crossing the year',
      [
        [2026, 4],
        [2026, 3],
        [2026, 2],
        [2026, 1],
        [2025, 12],
        [2025, 11],
      ],
      'pt-BR',
      'Nov 2025 – Abr 2026',
    ],
    ['a window with a single month', [[2025, 11]], 'pt-BR', 'Nov 2025'],
    [
      'a window inside one year in en-US',
      [
        [2026, 10],
        [2026, 9],
        [2026, 8],
        [2026, 7],
        [2026, 6],
        [2026, 5],
      ],
      'en-US',
      'May – Oct 2026',
    ],
    [
      'a window crossing the year in en-US',
      [
        [2026, 4],
        [2026, 3],
        [2026, 2],
        [2026, 1],
        [2025, 12],
        [2025, 11],
      ],
      'en-US',
      'Nov 2025 – Apr 2026',
    ],
  ] as [string, [number, number][], Locale, string][])(
    '%s',
    (_name, months, locale, expected) => {
      expect(windowRange(rowsFor(...months), formatFor(locale))).toBe(expected);
    },
  );

  it.each([
    [
      'pt-BR',
      [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ],
    ],
    [
      'en-US',
      [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
    ],
  ] as [Locale, string[]][])(
    'names the twelve months in %s without a trailing dot',
    (locale, names) => {
      const labels = names.map((_name, index) =>
        windowRange(
          rowsFor([2026, index + 1], [2026, index + 1]),
          formatFor(locale),
        ),
      );

      expect(labels).toEqual(names.map(name => `${name} – ${name} 2026`));
    },
  );
});
