import ReactTestRenderer, { act } from 'react-test-renderer';

import { EquipmentCard } from 'features/equipment/components/EquipmentCard';

const BASE = {
  name: 'Vaporizador Matrx VIP 3000',
  monthlyValue: 'R$ 70,83',
  monthlyUnitLabel: '/mês',
  sinceLabel: 'Desde Mar 2022 · Valor atual R$ 4.604',
  progressPercent: 46,
  progressLabel: '46% da vida útil utilizada',
  onPress: () => {},
};

async function renderCard(
  props: Partial<React.ComponentProps<typeof EquipmentCard>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<EquipmentCard {...BASE} {...props} />);
  });
  return renderer!;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .flat();
}

function classNames(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(node => typeof node.props?.className === 'string')
    .map(node => node.props.className as string);
}

test('shows the name, values and captions it receives', async () => {
  const renderer = await renderCard();

  expect(texts(renderer)).toEqual(
    expect.arrayContaining([
      BASE.name,
      BASE.monthlyValue,
      BASE.monthlyUnitLabel,
      BASE.sinceLabel,
      BASE.progressLabel,
    ]),
  );
});

test('the end-of-life badge only shows when its label is given', async () => {
  const without = await renderCard();
  expect(texts(without)).not.toContain('Fim da vida útil');

  const withBadge = await renderCard({ endOfLifeLabel: 'Fim da vida útil' });
  expect(texts(withBadge)).toContain('Fim da vida útil');
});

test('the bar is dark normally and yellow at end of life', async () => {
  const normal = await renderCard();
  expect(classNames(normal)).toContain('h-full rounded-full bg-label-primary');

  const ended = await renderCard({ endOfLifeLabel: 'Fim da vida útil' });
  expect(classNames(ended)).toContain(
    'h-full rounded-full bg-details-tertiary',
  );
});

test('the bar width follows progressPercent', async () => {
  const renderer = await renderCard({ progressPercent: 46 });

  const fill = renderer.root.find(
    node => node.props?.className === 'h-full rounded-full bg-label-primary',
  );
  expect(fill.props.style).toEqual({ width: '46%' });
});

test('pressing the card calls onPress', async () => {
  const onPress = jest.fn();
  const renderer = await renderCard({ onPress });

  const pressable = renderer.root.find(
    node => node.props?.accessibilityRole === 'button',
  );
  await act(async () => {
    pressable.props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
});
