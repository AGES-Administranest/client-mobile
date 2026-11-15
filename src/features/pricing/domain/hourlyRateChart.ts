import {
  monthKey,
  percentChange,
  type HourlyRateHistoryRow,
} from './hourlyRateHistory';

// The Y axis draws 2 to 4 lines, on "round" steps: 1, 2, 5, 10, 20, 50, 100...
// with no upper limit, so that the span of the values never decides how many
// lines there are. Whole reais only, as the labels carry no cents.
const MAX_TICKS = 4;
const MIN_TICKS = 2;
const STEP_MULTIPLIERS = [1, 2, 5];
// Breathing room above the highest and below the lowest value, and the least
// the axis may span around a flat series. 5% and not 10%: with 10% the six
// Figma months (98,07 at the top) would be pushed to a 60–120 axis, not the
// 70–100 the frames draw.
const PADDING_SHARE = 0.05;
const MIN_PADDING = 0.5;

export type ChartPoint = {
  id: string;
  // 0 at the oldest month of the window, 1 at the newest. A single month sits
  // in the middle.
  x: number;
  // 0 at the lowest tick, 1 at the highest.
  y: number;
  // The minimum of the month (the rate without the margin) on the same axis.
  minimumY: number;
  // The rate of the month is its minimum: the safety margin is 0%, so the two
  // lines would sit on top of each other.
  atMinimum: boolean;
};

// In how many months of the window the rate equals the minimum.
export type MinimumCoverage = 'all' | 'some' | 'none';

export type ChartTick = { value: number; y: number };

export type HourlyRateChart = {
  // Oldest month first, as the chart reads from left to right.
  points: ChartPoint[];
  // Lowest first.
  ticks: ChartTick[];
  minimumCoverage: MinimumCoverage;
  average: number;
  highest: HourlyRateHistoryRow;
  lowest: HourlyRateHistoryRow;
  // Percent from the oldest month of the window to the newest, or `null` with
  // a single month.
  change: number | null;
};

// Summed in cents so that a mean of 93,055 reads 93,06, as it does on paper,
// and not 93,05 from a float that falls just short.
function averageOf(values: readonly number[]): number {
  const cents = values.reduce((sum, value) => sum + Math.round(value * 100), 0);
  return Math.round(cents / values.length) / 100;
}

// 1, 2, 5, 10, 20, 50, 100, 200... far past any hourly rate. The bound only
// keeps a value that is not a number from looping for ever.
function* roundSteps(): Generator<number> {
  for (let magnitude = 1; magnitude <= 1e15; magnitude *= 10) {
    for (const multiplier of STEP_MULTIPLIERS) yield multiplier * magnitude;
  }
}

// Compared in cents, like the sums below: two amounts that print the same
// are the same, whatever a float left in the last digits (0.1 + 0.2).
const cents = (value: number) => Math.round(value * 100);

function coverageOf(points: readonly { atMinimum: boolean }[]) {
  const equal = points.filter(point => point.atMinimum).length;
  if (equal === 0) return 'none';
  return equal === points.length ? 'all' : 'some';
}

function tickValues(min: number, max: number): number[] {
  const padding = Math.max((max - min) * PADDING_SHARE, MIN_PADDING);
  // A rate is never negative, so the axis never dips under zero for the sake
  // of some breathing room.
  const floor = min >= 0 ? Math.max(min - padding, 0) : min - padding;
  const ceiling = max + padding;

  for (const step of roundSteps()) {
    const first = Math.floor(floor / step);
    const last = Math.ceil(ceiling / step);
    if (last - first + 1 <= MAX_TICKS) {
      // Two lines at least: the padding makes the range wider than zero.
      const end = Math.max(last, first + MIN_TICKS - 1);
      return Array.from(
        { length: end - first + 1 },
        (_, i) => (first + i) * step,
      );
    }
  }
  return [0, 1];
}

// The geometry of the evolution chart for a window of the history.
//
// `rows` come newest first, as the window does. The X axis counts records, so
// a month missing from the history takes no room: the label tells the month.
// The Y axis covers the rate and the minimum of every month, while the
// average, the highest and the lowest are read from the rate alone.
export function buildHourlyRateChart(
  rows: readonly HourlyRateHistoryRow[],
): HourlyRateChart {
  const oldestFirst = [...rows].reverse();
  const values = oldestFirst.map(row => row.rate.hourlyRate);
  const all = [
    ...values,
    ...oldestFirst.map(row => row.rate.minimumHourlyRate),
  ];

  const tickList = tickValues(Math.min(...all), Math.max(...all));
  const bottom = tickList[0];
  const span = tickList[tickList.length - 1] - bottom;
  const toY = (value: number) => (value - bottom) / span;

  const points = oldestFirst.map((row, index) => ({
    id: monthKey(row.rate.month),
    x: oldestFirst.length === 1 ? 0.5 : index / (oldestFirst.length - 1),
    y: toY(row.rate.hourlyRate),
    minimumY: toY(row.rate.minimumHourlyRate),
    atMinimum: cents(row.rate.hourlyRate) === cents(row.rate.minimumHourlyRate),
  }));

  // On a tie the newest month wins, which is the first one met in `rows`.
  const highest = rows.reduce((best, row) =>
    row.rate.hourlyRate > best.rate.hourlyRate ? row : best,
  );
  const lowest = rows.reduce((best, row) =>
    row.rate.hourlyRate < best.rate.hourlyRate ? row : best,
  );

  return {
    points,
    minimumCoverage: coverageOf(points),
    ticks: tickList.map(value => ({ value, y: toY(value) })),
    average: averageOf(values),
    highest,
    lowest,
    change:
      rows.length < 2
        ? null
        : percentChange(
            rows[rows.length - 1].rate.hourlyRate,
            rows[0].rate.hourlyRate,
          ),
  };
}
