import ReactTestRenderer, { act } from 'react-test-renderer';

import { StatCard } from 'app/components/ui/stat-card';

async function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(element);
  });

  return renderer!;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
}

test('shows the label above the value', async () => {
  const renderer = await render(<StatCard label="Peso" value="12 kg" />);

  expect(textsOf(renderer)).toEqual(['Peso', '12 kg']);
});

test('shows the detail line next to the value', async () => {
  const renderer = await render(
    <StatCard
      label="Deslocamento"
      value="R$ 96"
      detail="6 trechos no período"
    />,
  );

  expect(textsOf(renderer)).toEqual([
    'Deslocamento',
    'R$ 96',
    '6 trechos no período',
  ]);
});

test('keeps only the label while the value is loading', async () => {
  const renderer = await render(
    <StatCard label="Deslocamento" value="R$ 96" detail="6 trechos" loading />,
  );

  expect(textsOf(renderer)).toEqual(['Deslocamento']);
});
