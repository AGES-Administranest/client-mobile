import { buildHourlyRateChart } from './hourlyRateChart';
import { buildHistoryRows, monthKey } from './hourlyRateHistory';
import { HISTORY_PERIODS, newestPeriods } from './hourlyRateHistory.fixture';

// Rows newest first, one per [year, month, rate, minimum]. Without a minimum,
// it equals the rate and so adds nothing to the axis.
const rowsOf = (...entries: [number, number, number, number?][]) =>
  buildHistoryRows(
    entries.map(([year, month, hourlyRate, minimumHourlyRate]) => ({
      ...HISTORY_PERIODS[0],
      month: { month, year },
      hourlyRate,
      minimumHourlyRate: minimumHourlyRate ?? hourlyRate,
    })),
  );

const rowsWithRates = (...rates: number[]) =>
  rowsOf(
    ...rates.map((rate, i): [number, number, number] => [2026, 10 - i, rate]),
  );

const rowsWithMinimums = (...pairs: [number, number][]) =>
  rowsOf(
    ...pairs.map(([rate, minimum], i): [number, number, number, number] => [
      2026,
      10 - i,
      rate,
      minimum,
    ]),
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

describe('ticks: 2 to 4 lines whatever the values', () => {
  // The case that drew 52 lines: a month with almost no productive hours
  // makes the rate jump to the hundreds of thousands, and the old steps
  // stopped at 5000.
  const HUGE_SPAN = [90, 228000];
  const ROUND = [1, 2, 5];

  const isRound = (step: number) => {
    const magnitude = 10 ** Math.floor(Math.log10(step));
    return ROUND.includes(Math.round(step / magnitude));
  };

  it.each([
    ['the case that drew 52 lines', HUGE_SPAN],
    ['all values equal', [98.07, 98.07, 98.07]],
    ['all values equal and whole', [90, 90]],
    ['a few cents apart', [98.01, 98.03, 98.02]],
    ['a few cents, under one real', [0.1, 0.3]],
    ['a very large span', [10, 900]],
    ['a huge value', [1_000_000, 1_000_000]],
    ['two close values', [98.07, 98.06]],
    ['the Figma window', [98.07, 95.81, 92.3, 93.6, 90.15, 88.4]],
    ['a single month', [97.5]],
  ])('%s: %j', (_name, rates) => {
    const { ticks, points } = buildHourlyRateChart(rowsWithRates(...rates));
    const values = ticks.map(tick => tick.value);

    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(values.length).toBeLessThanOrEqual(4);
    // In order, from the lowest, on round steps, and the same step all along.
    const steps = values.slice(1).map((value, i) => value - values[i]);
    expect(steps.every(step => step > 0)).toBe(true);
    expect(new Set(steps).size).toBe(1);
    expect(isRound(steps[0])).toBe(true);
    // Every point, and every minimum, inside the axis.
    expect(values[0]).toBeLessThanOrEqual(Math.min(...rates));
    expect(values[values.length - 1]).toBeGreaterThanOrEqual(
      Math.max(...rates),
    );
    for (const point of points) {
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
    expect(ticks[0].y).toBe(0);
    expect(ticks[ticks.length - 1].y).toBe(1);
  });

  it('draws the 52 lines case on 4 lines at most, from zero', () => {
    const { ticks } = buildHourlyRateChart(rowsWithRates(...HUGE_SPAN));

    expect(ticks.map(tick => tick.value)).toEqual([0, 100000, 200000, 300000]);
  });

  it('draws a flat series as a band around the value', () => {
    const { ticks, points } = buildHourlyRateChart(rowsWithRates(98.07, 98.07));

    expect(ticks.map(tick => tick.value)).toEqual([97, 98, 99]);
    expect(points.map(point => point.y)).toEqual([points[0].y, points[0].y]);
    expect(points[0].y).toBeGreaterThan(0);
    expect(points[0].y).toBeLessThan(1);
  });

  it('uses whole reais even when the values are cents apart', () => {
    const { ticks } = buildHourlyRateChart(rowsWithRates(0.1, 0.3));

    expect(ticks.map(tick => tick.value)).toEqual([0, 1]);
  });

  it('draws R$ 10 to R$ 900 on 3 lines, from zero', () => {
    const { ticks } = buildHourlyRateChart(rowsWithRates(10, 900));

    expect(ticks.map(tick => tick.value)).toEqual([0, 500, 1000]);
  });

  it('never goes under zero for a rate that is not negative', () => {
    const { ticks } = buildHourlyRateChart(rowsWithRates(1, 3));

    expect(ticks[0].value).toBeGreaterThanOrEqual(0);
  });

  it('keeps the rule for any span, by sweeping them', () => {
    for (let exponent = -2; exponent <= 7; exponent += 0.25) {
      const high = 10 ** exponent;
      for (const low of [0, high / 3, high]) {
        const { ticks } = buildHourlyRateChart(
          rowsWithMinimums([high, low], [low, low]),
        );

        expect(ticks.length).toBeGreaterThanOrEqual(2);
        expect(ticks.length).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('rate equal to the minimum (margin 0%)', () => {
  it('is "all" when every month of the window has no margin', () => {
    const chart = buildHourlyRateChart(
      rowsWithMinimums([90, 90], [92.5, 92.5], [95, 95]),
    );

    expect(chart.minimumCoverage).toBe('all');
    expect(chart.points.map(point => point.atMinimum)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('is "some" and marks only those months', () => {
    const chart = buildHourlyRateChart(
      rowsWithMinimums([98.07, 98.07], [95.81, 81.72], [93.6, 93.6]),
    );

    expect(chart.minimumCoverage).toBe('some');
    // Oldest first.
    expect(chart.points.map(point => [point.id, point.atMinimum])).toEqual([
      ['2026-8', true],
      ['2026-9', false],
      ['2026-10', true],
    ]);
  });

  it('is "none" when every month keeps its margin', () => {
    const chart = buildHourlyRateChart(
      rowsWithMinimums([98.07, 81.72], [95.81, 79.9]),
    );

    expect(chart.minimumCoverage).toBe('none');
    expect(chart.points.every(point => !point.atMinimum)).toBe(true);
  });

  it('is "all" for a single month with no margin, and "none" with one', () => {
    expect(
      buildHourlyRateChart(rowsWithMinimums([90, 90])).minimumCoverage,
    ).toBe('all');
    expect(
      buildHourlyRateChart(rowsWithMinimums([90, 80])).minimumCoverage,
    ).toBe('none');
  });

  it('compares in cents: a float that falls short is still equal', () => {
    // 0.1 + 0.2 is 0.30000000000000004, and 98.07 * 100 is 9807.000000000001.
    const chart = buildHourlyRateChart(
      rowsWithMinimums([0.1 + 0.2, 0.3], [98.07, 9807 / 100]),
    );

    expect(chart.minimumCoverage).toBe('all');
  });

  it('compares in cents: one cent apart is not equal', () => {
    const chart = buildHourlyRateChart(
      rowsWithMinimums([98.07, 98.06], [90, 90]),
    );

    expect(chart.points.map(point => point.atMinimum)).toEqual([true, false]);
    expect(chart.minimumCoverage).toBe('some');
  });

  it('is equal when the difference is under half a cent', () => {
    const chart = buildHourlyRateChart(rowsWithMinimums([98.074, 98.07]));

    expect(chart.minimumCoverage).toBe('all');
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

describe('minimum line', () => {
  it('is placed on the same axis as the rate, below it', () => {
    const { points } = buildHourlyRateChart(buildHistoryRows(newestPeriods(6)));

    for (const point of points) {
      expect(point.minimumY).toBeLessThan(point.y);
      expect(point.minimumY).toBeGreaterThanOrEqual(0);
    }
  });

  it('widens the axis to 70-100 for the six months of the Figma', () => {
    const { ticks } = buildHourlyRateChart(buildHistoryRows(newestPeriods(6)));

    expect(ticks.map(tick => tick.value)).toEqual([70, 80, 90, 100]);
  });

  it('widens the axis to 60-90 for the oldest six months of the Figma', () => {
    const oldestSix = buildHistoryRows(newestPeriods(12).slice(6));

    const { ticks } = buildHourlyRateChart(oldestSix);

    expect(oldestSix.map(row => row.rate.hourlyRate)).toEqual([
      86.95, 85.1, 82.75, 83.4, 81.9, 80.2,
    ]);
    expect(oldestSix.map(row => row.rate.minimumHourlyRate)).toEqual([
      72.46, 70.92, 68.96, 69.5, 68.25, 66.83,
    ]);
    expect(ticks.map(tick => tick.value)).toEqual([60, 70, 80, 90]);
  });

  it('follows the rows: the last point is the newest month', () => {
    const { points } = buildHourlyRateChart(buildHistoryRows(newestPeriods(6)));

    expect(points[5].id).toBe('2026-10');
    expect(points[5].minimumY).toBeGreaterThan(points[0].minimumY);
  });

  it('covers a minimum above the lowest rate of the window', () => {
    const { ticks, points } = buildHourlyRateChart(
      rowsWithMinimums([98, 99], [90, 120]),
    );

    expect(ticks[ticks.length - 1].value).toBeGreaterThan(120);
    for (const point of points) {
      expect(point.minimumY).toBeLessThan(1);
    }
  });

  it('stays out of the average, the highest, the lowest and the change', () => {
    const chart = buildHourlyRateChart(
      rowsWithMinimums([100, 20], [90, 10], [80, 5]),
    );

    expect(chart.average).toBe(90);
    expect(chart.highest.rate.hourlyRate).toBe(100);
    expect(chart.lowest.rate.hourlyRate).toBe(80);
    expect(chart.change).toBeCloseTo(25);
  });
});
