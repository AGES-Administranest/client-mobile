import { Circle, Line, Polyline } from 'react-native-svg';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  HourlyRateEvolutionChart,
  PLOT_TOP,
  TOOLTIP_HEIGHT,
  type EvolutionChartPoint,
  type HourlyRateEvolutionChartProps,
} from './HourlyRateEvolutionChart';

const TOOLTIP = {
  month: 'Outubro 2026',
  value: 'R$ 98,07/h',
  change: { label: '+2,4% vs set', tone: 'up' as const },
};

const point = (
  id: string,
  x: number,
  y: number,
  minimumY = y - 0.1,
): EvolutionChartPoint => ({
  id,
  x,
  y,
  minimumY,
  label: id,
  accessibilityLabel: `${id}, por hora`,
});

const SIX = [
  point('a', 0, 0.2),
  point('b', 0.2, 0.3),
  point('c', 0.4, 0.5),
  point('d', 0.6, 0.45),
  point('e', 0.8, 0.7),
  point('f', 1, 0.9),
];

async function render(overrides: Partial<HourlyRateEvolutionChartProps> = {}) {
  const onSelect = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <HourlyRateEvolutionChart
        points={SIX}
        ticks={[
          { y: 0, label: 'R$ 85' },
          { y: 1, label: 'R$ 100' },
        ]}
        selectedId="f"
        tooltip={TOOLTIP}
        onSelect={onSelect}
        {...overrides}
      />,
    );
  });

  const columns = () =>
    renderer.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityRole === 'button',
    );
  const tooltip = () =>
    renderer.root.find(
      node =>
        node.props.pointerEvents === 'none' &&
        node.props.className?.includes('bg-tooltip-surface'),
    );
  return { renderer, onSelect, columns, tooltip };
}

const flat = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const DEFAULT_WIDTH = 318;
// The newest point sits 14px short of the right edge, the oldest 38px from the
// left one (the width of the Y labels).
const pointX = (x: number, width = DEFAULT_WIDTH) => 38 + x * (width - 38 - 14);

const edges = (column: ReactTestRenderer.ReactTestInstance) => {
  const { left, width } = flat(column.props.style);
  return { left: left as number, right: (left + width) as number };
};

describe('touch targets', () => {
  it.each([[2], [3], [6]])(
    'gives each of %s months a column as high as the chart, at least 44px',
    async count => {
      const { columns } = await render({
        points: SIX.slice(0, count).map((p, i) => ({
          ...p,
          x: i / (count - 1),
        })),
      });

      expect(columns()).toHaveLength(count);
      for (const column of columns()) {
        expect(flat(column.props.style).height).toBeGreaterThanOrEqual(44);
      }
    },
  );

  it.each([[2], [3], [6]])(
    'covers the whole chart with the columns of %s months, with no overlap and no gap',
    async count => {
      const { columns } = await render({
        points: SIX.slice(0, count).map((p, i) => ({
          ...p,
          x: i / (count - 1),
        })),
      });

      const all = columns().map(edges);

      expect(all[0].left).toBe(0);
      expect(all[all.length - 1].right).toBe(DEFAULT_WIDTH);
      all.slice(1).forEach((column, i) => {
        expect(column.left).toBe(all[i].right);
      });
    },
  );

  it('splits the columns at the midpoint between two months', async () => {
    const { columns } = await render();

    const [, , third, fourth] = columns().map(edges);

    expect(third.right).toBeCloseTo((pointX(0.4) + pointX(0.6)) / 2, 5);
    expect(fourth.left).toBe(third.right);
  });

  it('keeps the columns apart on a narrow chart, where they get under 44px wide', async () => {
    const { renderer, columns } = await render();

    await act(async () => {
      renderer.root
        .findAll(node => typeof node.props.onLayout === 'function')[0]
        .props.onLayout({ nativeEvent: { layout: { width: 200 } } });
    });

    const all = columns().map(edges);
    expect(all[0].left).toBe(0);
    expect(all[all.length - 1].right).toBe(200);
    all.slice(1).forEach((column, i) => {
      expect(column.left).toBe(all[i].right);
    });
  });

  it.each([
    ['just before', -1, 'c'],
    ['just after', 1, 'd'],
  ])(
    'selects the right month for a touch %s the border between two months',
    async (_name, offset, expected) => {
      const { columns, onSelect } = await render();
      const border = (pointX(0.4) + pointX(0.6)) / 2;

      const touched = columns().find(column => {
        const { left, right } = edges(column);
        return left <= border + offset && border + offset < right;
      });
      await act(async () => touched?.props.onPress());

      expect(onSelect).toHaveBeenCalledWith(expected);
    },
  );

  it('selects the month of the column that is pressed', async () => {
    const { columns, onSelect } = await render();

    await act(async () => columns()[2].props.onPress());

    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('marks only the selected month as selected', async () => {
    const { columns } = await render({ selectedId: 'c' });

    expect(
      columns().map(column => column.props.accessibilityState.selected),
    ).toEqual([false, false, true, false, false, false]);
  });
});

describe('tooltip', () => {
  it('sits over the selected point', async () => {
    const { tooltip } = await render({ selectedId: 'c' });

    const { left, width } = flat(tooltip().props.style);

    expect(width).toBe(112);
    // The point is at 38 + 0.4 * 266 = 144.4.
    expect(left).toBeCloseTo(144.4 - 56, 1);
  });

  it('stops at the right edge of the chart for the newest month', async () => {
    const { tooltip } = await render({ selectedId: 'f' });

    expect(flat(tooltip().props.style).left).toBe(318 - 112);
  });

  it('stops at the left edge of the chart for the oldest month', async () => {
    const { tooltip } = await render({ selectedId: 'a' });

    expect(flat(tooltip().props.style).left).toBe(0);
  });

  it('is not drawn without a selection', async () => {
    const { renderer } = await render({ selectedId: null, tooltip: null });

    expect(
      renderer.root.findAll(node =>
        String(node.props.className).includes('bg-tooltip-surface'),
      ),
    ).toEqual([]);
  });
});

describe('drawing', () => {
  it('draws a halo and a filled dot for the selected month only', async () => {
    const { renderer } = await render({ selectedId: 'c' });

    const radii = renderer.root.findAllByType(Circle).map(c => c.props.r);

    expect(radii.filter(r => r === 3.5)).toHaveLength(5);
    expect(radii.filter(r => r === 5)).toHaveLength(1);
    expect(radii.filter(r => r === 8)).toHaveLength(1);
  });

  it('draws the rate line solid and the minimum line dashed, 1.5px wide', async () => {
    const { renderer } = await render();

    const [minimum, rate] = renderer.root.findAllByType(Polyline);

    expect(minimum.props).toMatchObject({
      stroke: '#A07E62',
      strokeWidth: 1.5,
      strokeDasharray: '4 4',
    });
    expect(rate.props.strokeDasharray).toBeUndefined();
  });

  it('draws the marker of the selected month at half opacity, from behind the tooltip down to the baseline', async () => {
    const { renderer } = await render({ selectedId: 'c' });

    const marker = renderer.root
      .findAllByType(Line)
      .find(
        line =>
          line.props.strokeDasharray === '3 4' &&
          line.props.x1 === line.props.x2 &&
          line.props.stroke === '#594236',
      );

    expect(marker?.props).toMatchObject({
      strokeOpacity: 0.5,
      y1: 48,
      y2: 180,
    });
    expect(marker?.props.y1).toBeLessThan(TOOLTIP_HEIGHT);
  });

  it('puts no dots on the minimum line', async () => {
    const { renderer } = await render({ selectedId: null, tooltip: null });

    expect(renderer.root.findAllByType(Circle)).toHaveLength(SIX.length);
  });
});

describe('room for the tooltip', () => {
  it('keeps the top of the plot below the tooltip, with room for the halo', () => {
    expect(PLOT_TOP).toBeGreaterThan(TOOLTIP_HEIGHT);
    expect(PLOT_TOP - TOOLTIP_HEIGHT).toBeGreaterThanOrEqual(8);
  });

  it('never draws the highest point under the tooltip', async () => {
    const { renderer } = await render({
      points: [point('a', 0, 0.5), point('b', 1, 1)],
      selectedId: 'b',
    });

    const halo = renderer.root
      .findAllByType(Circle)
      .find(circle => circle.props.r === 8);

    expect((halo?.props.cy as number) - 8).toBeGreaterThanOrEqual(
      TOOLTIP_HEIGHT,
    );
  });
});
