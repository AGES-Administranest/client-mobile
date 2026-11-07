import {
  buildHistoryRows,
  groupByYear,
  monthKey,
  percentChange,
  splitIntoWindows,
  summarizeSinceStart,
  toHourlyRateHistory,
  type HourlyRatePeriod,
} from './hourlyRateHistory';
import { HISTORY_PERIODS, HISTORY_RESPONSE } from './hourlyRateHistory.fixture';

function rate(
  year: number,
  month: number,
  hourlyRate: number,
): HourlyRatePeriod {
  return { ...HISTORY_PERIODS[0], month: { month, year }, hourlyRate };
}

const keys = (rows: ReturnType<typeof buildHistoryRows>) =>
  rows.map(row => monthKey(row.rate.month));

describe('buildHistoryRows', () => {
  it.each([
    [
      'already newest first',
      [
        [2026, 10],
        [2026, 9],
        [2026, 8],
      ],
    ],
    [
      'oldest first',
      [
        [2026, 8],
        [2026, 9],
        [2026, 10],
      ],
    ],
    [
      'shuffled',
      [
        [2026, 9],
        [2026, 10],
        [2026, 8],
      ],
    ],
  ])('sorts newest to oldest when it comes %s', (_name, months) => {
    const rows = buildHistoryRows(months.map(([y, m]) => rate(y, m, 90)));

    expect(keys(rows)).toEqual(['2026-10', '2026-9', '2026-8']);
  });

  it('sorts across the turn of the year', () => {
    const rows = buildHistoryRows([
      rate(2026, 1, 90),
      rate(2025, 12, 90),
      rate(2026, 2, 90),
      rate(2025, 11, 90),
    ]);

    expect(keys(rows)).toEqual(['2026-2', '2026-1', '2025-12', '2025-11']);
  });

  it('does not change the list it receives', () => {
    const history = [rate(2026, 8, 90), rate(2026, 10, 90)];

    buildHistoryRows(history);

    expect(history.map(item => item.month.month)).toEqual([8, 10]);
  });

  it('compares each month with the previous one on record', () => {
    const rows = buildHistoryRows([
      rate(2026, 8, 92.3),
      rate(2026, 9, 95.81),
      rate(2026, 10, 98.07),
    ]);

    expect(rows.map(row => row.variation?.toFixed(1))).toEqual([
      '2.4',
      '3.8',
      undefined,
    ]);
  });

  it('skips a month without a calculation instead of reading it as zero', () => {
    const rows = buildHistoryRows([rate(2026, 10, 110), rate(2026, 7, 100)]);

    expect(rows[0].variation).toBeCloseTo(10);
    expect(rows[1]).toMatchObject({ variation: null, isOldest: true });
  });

  it('gives a drop a negative variation', () => {
    const [latest] = buildHistoryRows([
      rate(2026, 8, 93.6),
      rate(2026, 9, 92.3),
    ]);

    expect(latest.variation?.toFixed(1)).toBe('-1.4');
  });

  it('leaves the oldest month without a variation', () => {
    const rows = buildHistoryRows([rate(2026, 9, 90), rate(2026, 10, 95)]);

    expect(rows.map(row => row.isOldest)).toEqual([false, true]);
    expect(rows[1].variation).toBeNull();
  });

  it('has no variation to compare against a previous rate of zero', () => {
    const [latest] = buildHistoryRows([rate(2026, 9, 0), rate(2026, 10, 95)]);

    expect(latest.variation).toBeNull();
  });

  it('answers an empty list with an empty list', () => {
    expect(buildHistoryRows([])).toEqual([]);
  });

  it('marks the only month as the oldest', () => {
    expect(buildHistoryRows([rate(2026, 10, 98.07)])).toMatchObject([
      { variation: null, isOldest: true },
    ]);
  });
});

describe('percentChange', () => {
  it.each([
    [100, 110, 10],
    [100, 90, -10],
    [100, 100, 0],
    [80.2, 98.07, 22.28],
  ])('from %s to %s is %s%%', (from, to, expected) => {
    expect(percentChange(from, to)).toBeCloseTo(expected, 2);
  });

  it.each([0, -5])('is null when the base is %s', base => {
    expect(percentChange(base, 10)).toBeNull();
  });
});

describe('splitIntoWindows', () => {
  const items = (count: number) => Array.from({ length: count }, (_, i) => i);

  it.each([
    [0, []],
    [1, [1]],
    [5, [5]],
    [6, [6]],
    [7, [6, 6]],
    [8, [6, 6]],
    [12, [6, 6]],
    [13, [6, 6, 6]],
    [18, [6, 6, 6]],
    [19, [6, 6, 6, 6]],
  ])('splits %s records into windows of %j', (count, sizes) => {
    expect(splitIntoWindows(items(count)).map(window => window.length)).toEqual(
      sizes,
    );
  });

  it.each([
    [6, [[0, 1, 2, 3, 4, 5]]],
    [
      7,
      [
        [0, 1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 6],
      ],
    ],
    [
      12,
      [
        [0, 1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10, 11],
      ],
    ],
    [
      13,
      [
        [0, 1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10, 11],
        [7, 8, 9, 10, 11, 12],
      ],
    ],
  ])('splits %s records into these windows', (count, windows) => {
    expect(splitIntoWindows(items(count))).toEqual(windows);
  });

  it('always ends with the oldest records, never a short window', () => {
    for (const count of [7, 8, 11, 13, 17, 25]) {
      const windows = splitIntoWindows(items(count));

      expect(windows[windows.length - 1]).toEqual(items(count).slice(-6));
    }
  });

  it('does not change the list it receives', () => {
    const list = items(8);

    splitIntoWindows(list);

    expect(list).toEqual(items(8));
  });

  it('counts records, so a gap in the months does not shorten a window', () => {
    const rows = buildHistoryRows(
      [10, 9, 8, 6, 5, 3, 2].map(month => rate(2026, month, 90)),
    );

    expect(splitIntoWindows(rows)[0].map(row => row.rate.month.month)).toEqual([
      10, 9, 8, 6, 5, 3,
    ]);
  });
});

describe('summarizeSinceStart', () => {
  it.each([[0], [1]])('is null with %s months', count => {
    const rows = buildHistoryRows(
      Array.from({ length: count }, (_, i) => rate(2026, 10 - i, 90)),
    );

    expect(summarizeSinceStart(rows)).toBeNull();
  });

  it('compares the newest month with the oldest', () => {
    const rows = buildHistoryRows([
      rate(2025, 11, 80.2),
      rate(2026, 1, 83.4),
      rate(2026, 10, 98.07),
    ]);

    const summary = summarizeSinceStart(rows);

    expect(summary?.from.month).toEqual({ month: 11, year: 2025 });
    expect(summary?.to.month).toEqual({ month: 10, year: 2026 });
    expect(summary?.difference).toBeCloseTo(17.87, 2);
    expect(summary?.percent).toBeCloseTo(22.28, 2);
  });

  it('reports a loss as negative', () => {
    const rows = buildHistoryRows([rate(2026, 9, 100), rate(2026, 10, 90)]);

    expect(summarizeSinceStart(rows)).toMatchObject({
      difference: -10,
      percent: -10,
    });
  });
});

describe('groupByYear', () => {
  it('groups newest year first, keeping each year newest first', () => {
    const rows = buildHistoryRows([
      rate(2025, 11, 80),
      rate(2025, 12, 81),
      rate(2026, 1, 82),
      rate(2026, 2, 83),
    ]);

    expect(
      groupByYear(rows).map(group => [group.year, keys(group.rows)]),
    ).toEqual([
      [2026, ['2026-2', '2026-1']],
      [2025, ['2025-12', '2025-11']],
    ]);
  });

  it('has a single group when every month is of the same year', () => {
    expect(
      groupByYear(buildHistoryRows([rate(2026, 9, 1), rate(2026, 10, 1)])),
    ).toHaveLength(1);
  });

  it('answers an empty list with no groups', () => {
    expect(groupByYear([])).toEqual([]);
  });
});

describe('toHourlyRateHistory', () => {
  it('turns the decimal strings of each month into numbers', () => {
    expect(toHourlyRateHistory([HISTORY_RESPONSE[0]])).toEqual([
      {
        month: { month: 10, year: 2026 },
        hourlyRate: 98.07,
        productiveHours: 130,
        minimumHourlyRate: 81.72,
        calculatedAt: '2026-10-19T20:42:00.000Z',
      },
    ]);
  });

  it('keeps the order of the API, newest month first', () => {
    expect(
      toHourlyRateHistory(HISTORY_RESPONSE).map(period =>
        monthKey(period.month),
      ),
    ).toEqual(HISTORY_PERIODS.map(period => monthKey(period.month)));
  });

  it('answers an empty list with an empty list', () => {
    expect(toHourlyRateHistory([])).toEqual([]);
  });
});
