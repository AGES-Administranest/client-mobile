import { locales, type Locale } from 'shared/i18n/locales';
import { translate } from 'shared/i18n/translate';

import {
  evolutionCardView,
  formatChange,
  formatSignedCurrency,
  windowRange,
} from './hourlyRateHistoryPresenter';
import {
  buildHistoryRows,
  type HourlyRateHistoryRow,
} from '../domain/hourlyRateHistory';
import {
  HISTORY_PERIODS,
  newestPeriods,
} from '../domain/hourlyRateHistory.fixture';

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

describe('evolutionCardView', () => {
  const view = (
    count: number,
    selectedId: string | null,
    locale: Locale = 'pt-BR',
  ) =>
    evolutionCardView(
      buildHistoryRows(newestPeriods(count)),
      selectedId,
      jest.fn(),
      formatFor(locale),
    );

  it.each([
    ['pt-BR', '+10,9% no período', 'Evolução', 'Valor da hora'],
    ['en-US', '+10.9% in the period', 'Trend', 'Hourly rate'],
  ] as [Locale, string, string, string][])(
    'writes the header in %s',
    (locale, chip, title, legend) => {
      const card = view(6, '2026-10', locale);

      expect(card.title).toBe(title);
      expect(card.periodChange).toEqual({ tone: 'up', label: chip });
      expect(card.legend).toBe(legend);
    },
  );

  it('counts the months in the title of a short window', () => {
    expect(view(3, '2026-10').title).toBe('Evolução · 3 meses');
    expect(view(2, '2026-10').title).toBe('Evolução · 2 meses');
  });

  it('gives a fall in the period the down tone', () => {
    const rows = buildHistoryRows([
      {
        ...HISTORY_PERIODS[0],
        month: { month: 9, year: 2026 },
        hourlyRate: 100,
      },
      {
        ...HISTORY_PERIODS[0],
        month: { month: 10, year: 2026 },
        hourlyRate: 90,
      },
    ]);

    const card = evolutionCardView(rows, null, jest.fn(), formatFor('pt-BR'));

    expect(card.periodChange).toEqual({
      tone: 'down',
      label: '−10,0% no período',
    });
  });

  it.each([
    [
      'pt-BR',
      [
        ['Média', 'R$ 93,06', 'mai – out'],
        ['Maior', 'R$ 98,07', 'outubro'],
        ['Menor', 'R$ 88,40', 'maio'],
      ],
    ],
    [
      'en-US',
      [
        ['Average', 'R$93.06', 'may – oct'],
        ['Highest', 'R$98.07', 'october'],
        ['Lowest', 'R$88.40', 'may'],
      ],
    ],
  ] as [Locale, string[][]][])(
    'summarises the period in %s',
    (locale, expected) => {
      expect(
        view(6, '2026-10', locale).stats.map(stat => [
          stat.label,
          plain(stat.value),
          stat.caption,
        ]),
      ).toEqual(expected);
    },
  );

  it('names the months of the summary in lower case, whole for the extremes', () => {
    const { stats } = view(3, '2026-10');

    expect(stats.map(stat => stat.caption)).toEqual([
      '3 meses',
      'outubro',
      'agosto',
    ]);
  });

  it('labels the Y axis with whole reais, and the X axis with short months', () => {
    const { chart } = view(6, '2026-10');

    expect(chart.ticks.map(tick => plain(tick.label))).toEqual([
      'R$ 85',
      'R$ 90',
      'R$ 95',
      'R$ 100',
    ]);
    expect(chart.points.map(point => point.label)).toEqual([
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
    ]);
  });

  it.each([
    ['pt-BR', 'Outubro 2026', 'R$ 98,07/h', '+2,4% vs set'],
    ['en-US', 'October 2026', 'R$98.07/h', '+2.4% vs sep'],
  ] as [Locale, string, string, string][])(
    'writes the tooltip in %s',
    (locale, month, value, change) => {
      const { tooltip } = view(6, '2026-10', locale).chart;

      expect(tooltip).toMatchObject({
        month,
        change: { tone: 'up', label: change },
      });
      expect(plain(tooltip?.value ?? '')).toBe(value);
    },
  );

  it('compares a tooltip with the month before it on record, not the calendar one', () => {
    const rows = buildHistoryRows([
      {
        ...HISTORY_PERIODS[0],
        month: { month: 10, year: 2026 },
        hourlyRate: 110,
      },
      {
        ...HISTORY_PERIODS[0],
        month: { month: 7, year: 2026 },
        hourlyRate: 100,
      },
    ]);

    const { chart } = evolutionCardView(
      rows,
      '2026-10',
      jest.fn(),
      formatFor('pt-BR'),
    );

    expect(chart.tooltip?.change).toEqual({
      tone: 'up',
      label: '+10,0% vs jul',
    });
  });

  it('leaves the change out for the oldest month of the history', () => {
    const { chart } = view(6, '2026-5');

    expect(chart.tooltip).toMatchObject({ month: 'Maio 2026' });
    expect(chart.tooltip?.change).toBeNull();
  });

  it('keeps the change of the oldest month of a window when older months exist', () => {
    const rows = buildHistoryRows(newestPeriods(12));

    const { chart } = evolutionCardView(
      rows.slice(0, 6),
      '2026-5',
      jest.fn(),
      formatFor('pt-BR'),
    );

    expect(chart.tooltip?.change).toEqual({
      tone: 'up',
      label: '+1,7% vs abr',
    });
  });

  it('has no tooltip without a selection', () => {
    expect(view(6, null).chart.tooltip).toBeNull();
  });

  it('reads each column aloud with the month, the value and the change', () => {
    const { chart } = view(6, '2026-10');

    expect(chart.points.map(point => plain(point.accessibilityLabel))).toEqual([
      'Maio 2026, R$ 88,40 por hora',
      'Junho 2026, R$ 90,15 por hora, +2,0% vs maio',
      'Julho 2026, R$ 93,60 por hora, +3,8% vs junho',
      'Agosto 2026, R$ 92,30 por hora, −1,4% vs julho',
      'Setembro 2026, R$ 95,81 por hora, +3,8% vs agosto',
      'Outubro 2026, R$ 98,07 por hora, +2,4% vs setembro',
    ]);
  });
});
