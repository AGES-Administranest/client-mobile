import ReactTestRenderer, { act } from 'react-test-renderer';

import { PricingOnboarding } from 'features/pricing';

const MESSAGE = 'Informe sua meta, jornada e margem para ver o cálculo.';

async function renderOnboarding(onConfigure = () => {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <PricingOnboarding
        message={MESSAGE}
        configureLabel="Configurar"
        onConfigure={onConfigure}
      />,
    );
  });
  return renderer!;
}

function textContents(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => JSON.stringify(node.props.children))
    .join(' ');
}

test('explains what the data is for and offers to configure it', async () => {
  const renderer = await renderOnboarding();

  const contents = textContents(renderer);

  expect(contents).toContain(MESSAGE);
  expect(contents).toContain('Configurar');
});

test('pressing "Configurar" asks the screen to open the goals form', async () => {
  const onConfigure = jest.fn();
  const renderer = await renderOnboarding(onConfigure);

  const button = renderer.root.findAll(
    node => node.props?.role === 'button' && !!node.props.onPress,
  )[0];

  await act(async () => {
    button.props.onPress();
  });

  expect(onConfigure).toHaveBeenCalledTimes(1);
});
