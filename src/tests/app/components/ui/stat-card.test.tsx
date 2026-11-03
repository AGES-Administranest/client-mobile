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
