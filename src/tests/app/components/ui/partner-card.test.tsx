import ReactTestRenderer, { act } from 'react-test-renderer';

import { PartnerCard } from 'app/components/ui/partner-card';

async function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(element);
  });

  return renderer!;
}

test('renders name and location', async () => {
  const renderer = await render(
    <PartnerCard name="Clínica VetNova" location="São Paulo, SP" />,
  );

  const texts = JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );

  expect(texts).toContain('Clínica VetNova');
  expect(texts).toContain('São Paulo, SP');
});

test('calls onPress when tapped', async () => {
  const onPress = jest.fn();
  const renderer = await render(
    <PartnerCard
      name="Clínica VetNova"
      location="São Paulo, SP"
      onPress={onPress}
    />,
  );

  await act(() => {
    renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
});
