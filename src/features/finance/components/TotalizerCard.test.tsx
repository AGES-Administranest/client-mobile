import { ArrowDown, ArrowUp } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { Icon } from 'app/components/ui/icon';

import { TotalizerCard, type TotalizerType } from './TotalizerCard';

async function render(type: TotalizerType) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <TotalizerCard title="Receitas" value="R$ 10,50" type={type} />,
    );
  });
  return renderer;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
}

test('shows the title, the value and an up arrow for income', async () => {
  const renderer = await render('income');

  expect(textsOf(renderer)).toEqual(
    expect.arrayContaining(['Receitas', 'R$ 10,50']),
  );
  expect(
    renderer.root.findAllByType(Icon).some(node => node.props.as === ArrowUp),
  ).toBe(true);
});

test('uses a down arrow for an expense', async () => {
  const renderer = await render('expense');

  expect(
    renderer.root.findAllByType(Icon).some(node => node.props.as === ArrowDown),
  ).toBe(true);
});
