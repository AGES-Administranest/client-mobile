import { buildHourlyRateChart } from './hourlyRateChart';
import { buildHistoryRows, monthKey } from './hourlyRateHistory';
import { HISTORY_PERIODS, newestPeriods } from './hourlyRateHistory.fixture';

// Rows newest first, one per [year, month, rate].
const rowsOf = (...entries: [number, number, number][]) =>
  buildHistoryRows(
    entries.map(([year, month, hourlyRate]) => ({
      ...HISTORY_PERIODS[0],
      month: { month, year },
      hourlyRate,
    })),
  );

const rowsWithRates = (...rates: number[]) =>
  rowsOf(
    ...rates.map((rate, i): [number, number, number] => [2026, 10 - i, rate]),
  );

describe('points', () => {
  it('puts two months at the two ends, the oldest on the left', () => {
    const { points } = buildHourlyRateChart(rowsWithRates(98.07, 95.81));

    expect(points.map(point => [point.id, point.x])).toEqual([
      ['2026-9', 0],
      ['2026-10', 1],
    ]);
    expect(points[0].y).toBeLessThan(points[1].y);
  });

  it('spreads six months evenly, oldest first', () => {
    const rows = buildHistoryRows(newestPeriods(6));

    const { points } = buildHourlyRateChart(rows);

    expect(points.map(point => point.id)).toEqual([
      '2026-5',
      '2026-6',
      '2026-7',
      '2026-8',
      '2026-9',
      '2026-10',
    ]);
    expect(points.map(point => point.x)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('puts a single month in the middle', () => {
    expect(buildHourlyRateChart(rowsWithRates(90)).points[0].x).toBe(0.5);
  });

  it('gives a gap between months no room: the points stay evenly spaced', () => {
    const rows = rowsOf([2026, 10, 98], [2026, 7, 92], [2026, 6, 90]);

    const { points } = buildHourlyRateChart(rows);

    expect(points.map(point => point.x)).toEqual([0, 0.5, 1]);
    expect(points.map(point => point.id)).toEqual([
      '2026-6',
      '2026-7',
      '2026-10',
    ]);
  });

  it('keeps every point inside the axis', () => {
    const { points } = buildHourlyRateChart(
      buildHistoryRows(newestPeriods(12)),
    );

    for (const point of points) {
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(1);
    }
  });
});

describe('flat series', () => {
  it('does not divide by zero and centres the line', () => {
    const { points, ticks } = buildHourlyRateChart(rowsWithRates(90, 90, 90));

    expect(ticks.map(tick => tick.value)).toEqual([89, 90, 91]);
    for (const point of points) {
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.y).toBeCloseTo(0.5);
    }
  });

  it('works with a single month too', () => {
    const { points, change } = buildHourlyRateChart(rowsWithRates(90));

    expect(points[0].y).toBeCloseTo(0.5);
    expect(change).toBeNull();
  });
});

describe('ticks', () => {
  it.each([
    ['values a few reais apart', [98.07, 95.81, 93.6], [90, 95, 100]],
    [
      'the Figma window',
      [98.07, 95.81, 92.3, 93.6, 90.15, 88.4],
      [85, 90, 95, 100],
    ],
    ['values close to each other', [98.07, 95.81], [94, 96, 98, 100]],
    ['values far from each other', [140, 100, 60], [50, 100, 150]],
    ['values that sit on a tick', [100, 90], [80, 90, 100, 110]],
  ])('%s: %j', (_name, rates, expected) => {
    const { ticks } = buildHourlyRateChart(rowsWithRates(...rates));

    expect(ticks.map(tick => tick.value)).toEqual(expected);
  });

  it.each([
    [[98.07, 95.81]],
    [[98.07, 95.81, 93.6]],
    [[140, 100, 60]],
    [[100, 90]],
    [[90, 90]],
    [[1234.5, 1190.2, 1301]],
  ])(
    '%j gives 3 or 4 lines that cover every value with room to spare',
    rates => {
      const { ticks } = buildHourlyRateChart(rowsWithRates(...rates));
      const values = ticks.map(tick => tick.value);

      expect(values.length).toBeGreaterThanOrEqual(3);
      expect(values.length).toBeLessThanOrEqual(4);
      expect(values[0]).toBeLessThan(Math.min(...rates));
      expect(values[values.length - 1]).toBeGreaterThan(Math.max(...rates));
    },
  );

  it('places the lowest line at 0 and the highest at 1', () => {
    const { ticks } = buildHourlyRateChart(rowsWithRates(98.07, 90));

    expect(ticks[0].y).toBe(0);
    expect(ticks[ticks.length - 1].y).toBe(1);
  });
});

describe('summary', () => {
  it('averages, and finds the highest and the lowest month', () => {
    const chart = buildHourlyRateChart(buildHistoryRows(newestPeriods(6)));

    expect(chart.average).toBe(93.06);
    expect(monthKey(chart.highest.rate.month)).toBe('2026-10');
    expect(chart.highest.rate.hourlyRate).toBe(98.07);
    expect(monthKey(chart.lowest.rate.month)).toBe('2026-5');
    expect(chart.lowest.rate.hourlyRate).toBe(88.4);
  });

  it.each([
    ['half a cent rounds up, as on paper', [93.04, 93.07], 93.06],
    ['whole cents stay as they are', [90, 91, 92], 91],
  ])('averages in cents: %s', (_name, rates, expected) => {
    expect(buildHourlyRateChart(rowsWithRates(...rates)).average).toBe(
      expected,
    );
  });

  it('keeps the newest month when the highest ties', () => {
    const chart = buildHourlyRateChart(
      rowsOf([2026, 10, 95], [2026, 9, 99], [2026, 8, 99], [2026, 7, 90]),
    );

    expect(monthKey(chart.highest.rate.month)).toBe('2026-9');
  });

  it('keeps the newest month when the lowest ties', () => {
    const chart = buildHourlyRateChart(
      rowsOf([2026, 10, 95], [2026, 9, 90], [2026, 8, 90], [2026, 7, 99]),
    );

    expect(monthKey(chart.lowest.rate.month)).toBe('2026-9');
  });

  it('is the same month for the highest and the lowest when all are equal', () => {
    const chart = buildHourlyRateChart(rowsWithRates(90, 90));

    expect(monthKey(chart.highest.rate.month)).toBe('2026-10');
    expect(monthKey(chart.lowest.rate.month)).toBe('2026-10');
  });
});

describe('change', () => {
  it.each([
    ['a rise from the oldest to the newest', [98.07, 95.81, 88.4], 10.94],
    ['a fall', [88.4, 95.81, 98.07], -9.86],
    ['no change', [90, 95, 90], 0],
  ])('%s', (_name, rates, expected) => {
    expect(buildHourlyRateChart(rowsWithRates(...rates)).change).toBeCloseTo(
      expected,
      2,
    );
  });

  it('is the 6 month window of the Figma: +10.9%', () => {
    const chart = buildHourlyRateChart(buildHistoryRows(newestPeriods(6)));

    expect(chart.change).toBeCloseTo(10.94, 2);
  });

  it('is null with a single month', () => {
    expect(buildHourlyRateChart(rowsWithRates(90)).change).toBeNull();
  });
});

describe('second series', () => {
  it('leaves it out by default', () => {
    const { points } = buildHourlyRateChart(rowsWithRates(98.07, 95.81));

    expect(points.map(point => point.secondaryY)).toEqual([null, null]);
  });

  it('is placed on the same axis, which grows to fit it', () => {
    const rows = rowsWithRates(98.07, 95.81, 92.3);

    const alone = buildHourlyRateChart(rows);
    const withMinimum = buildHourlyRateChart(rows, [81.72, 79.84, 76.92]);

    expect(withMinimum.ticks[0].value).toBeLessThan(alone.ticks[0].value);
    expect(withMinimum.points.map(point => point.secondaryY)).toEqual([
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    ]);
    for (const point of withMinimum.points) {
      expect(point.secondaryY).toBeLessThan(point.y);
      expect(point.secondaryY).toBeGreaterThan(0);
    }
  });

  it('follows the rows: the first value is the newest month', () => {
    const { points } = buildHourlyRateChart(rowsWithRates(98.07, 95.81), [
      81.72,
      null,
    ]);

    expect(points.map(point => point.secondaryY === null)).toEqual([
      true,
      false,
    ]);
  });
});
