import { Circle, Polyline } from 'react-native-svg';
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
  secondaryY: number | null = null,
): EvolutionChartPoint => ({
  id,
  x,
  y,
  secondaryY,
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

describe('touch targets', () => {
  it.each([[2], [3], [6]])(
    'gives each of %s months a column of at least 44px by 44px',
    async count => {
      const { columns } = await render({
        points: SIX.slice(0, count).map((p, i) => ({
          ...p,
          x: count === 1 ? 0.5 : i / (count - 1),
        })),
      });

      expect(columns()).toHaveLength(count);
      for (const column of columns()) {
        const { width, height } = flat(column.props.style);
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
      }
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

  it('draws only the line of the value while there is no second series', async () => {
    const { renderer } = await render();

    expect(renderer.root.findAllByType(Polyline)).toHaveLength(1);
  });

  it('draws a dashed second line when the points carry one', async () => {
    const { renderer } = await render({
      points: SIX.map(p => ({ ...p, secondaryY: p.y - 0.1 })),
    });

    const lines = renderer.root.findAllByType(Polyline);

    expect(lines).toHaveLength(2);
    expect(lines.filter(line => line.props.strokeDasharray)).toHaveLength(1);
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
