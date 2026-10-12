import ReactTestRenderer, { act } from 'react-test-renderer';

import { PricingOnboarding } from 'features/pricing';

const MESSAGE = 'Preencha os campos para que os valores sejam calculados';

async function renderOnboarding() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PricingOnboarding message={MESSAGE} />,
    );
  });
  return renderer;
}

test('tells the user to fill in the fields before any value is shown', async () => {
  const renderer = await renderOnboarding();

  const texts = renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(texts).toEqual([MESSAGE]);
});

test('is a plain notice, with nothing to press', async () => {
  const renderer = await renderOnboarding();

  expect(
    renderer.root.findAll(node => typeof node.props?.onPress === 'function'),
  ).toHaveLength(0);
});
