import ReactTestRenderer, { act } from 'react-test-renderer';

import { Icon } from 'app/components/ui/icon';

import { HourlyRateEvolutionCard } from './HourlyRateEvolutionCard';
import { TrendChip, type TrendChipProps } from './TrendChip';

function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
}

const iconCount = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByType(Icon).length;

describe('TrendChip icon', () => {
  it.each([['up'], ['down']] as [TrendChipProps['tone']][])(
    'draws the arrow of a %s by default',
    tone => {
      expect(iconCount(render(<TrendChip tone={tone} label="1,0%" />))).toBe(1);
    },
  );

  it.each([['up'], ['down'], ['flat']] as [TrendChipProps['tone']][])(
    'leaves the arrow of a %s out with showIcon off',
    tone => {
      expect(
        iconCount(
          render(<TrendChip tone={tone} label="1,0%" showIcon={false} />),
        ),
      ).toBe(0);
    },
  );
});

describe('the period chip of the evolution card', () => {
  it('has no arrow, as in the Figma', () => {
    const renderer = render(
      <HourlyRateEvolutionCard
        title="Evolução"
        periodChange={{ tone: 'up', label: '+10,9% no período' }}
        legend="Valor da hora"
        minimumLegend="Mínimo (sem margem)"
        chart={{
          points: [
            {
              id: 'a',
              x: 0,
              y: 0.2,
              minimumY: 0.1,
              label: 'Mai',
              accessibilityLabel: 'Maio',
            },
            {
              id: 'b',
              x: 1,
              y: 0.8,
              minimumY: 0.5,
              label: 'Jun',
              accessibilityLabel: 'Junho',
            },
          ],
          ticks: [
            { y: 0, label: 'R$ 70' },
            { y: 1, label: 'R$ 100' },
          ],
          selectedId: null,
          tooltip: null,
          onSelect: jest.fn(),
        }}
        stats={[]}
      />,
    );

    expect(iconCount(renderer)).toBe(0);
  });
});
