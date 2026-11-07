import {
  monthKey,
  percentChange,
  type HourlyRateHistoryRow,
} from './hourlyRateHistory';

// Steps for the Y axis, from the finest to the coarsest: the first one that
// leaves 4 lines or fewer is the one used.
const TICK_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
const MAX_TICKS = 4;
// Breathing room above the highest and below the lowest value, and the least
// the axis may span around a flat series.
const PADDING_SHARE = 0.05;
const MIN_PADDING = 0.5;

export type ChartPoint = {
  id: string;
  // 0 at the oldest month of the window, 1 at the newest. A single month sits
  // in the middle.
  x: number;
  // 0 at the lowest tick, 1 at the highest.
  y: number;
  value: number;
  // The minimum of the month (the rate without the margin) on the same axis.
  minimumY: number;
};

export type ChartTick = { value: number; y: number };

export type HourlyRateChart = {
  // Oldest month first, as the chart reads from left to right.
  points: ChartPoint[];
  // Lowest first.
  ticks: ChartTick[];
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

function tickValues(min: number, max: number): number[] {
  const padding = Math.max((max - min) * PADDING_SHARE, MIN_PADDING);
  const floor = min - padding;
  const ceiling = max + padding;

  for (const step of TICK_STEPS) {
    const first = Math.floor(floor / step);
    const last = Math.ceil(ceiling / step);
    if (last - first + 1 <= MAX_TICKS || step === TICK_STEPS.at(-1)) {
      return Array.from(
        { length: last - first + 1 },
        (_, i) => Math.round((first + i) * step * 100) / 100,
      );
    }
  }
  return [];
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
    value: row.rate.hourlyRate,
    minimumY: toY(row.rate.minimumHourlyRate),
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
