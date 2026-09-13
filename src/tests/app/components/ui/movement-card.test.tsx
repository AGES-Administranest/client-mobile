import ReactTestRenderer, { act } from 'react-test-renderer';

import { MovementCard } from 'app/components/ui/movement-card';

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

test('renders title, subtitle, value, caption and link', async () => {
  const renderer = await render(
    <MovementCard
      direction="outbound"
      title="Propofol 10mg/ml 20ml"
      subtitle="08 set"
      category="Saída por atendimento"
      value="-R$ 39,80"
      valueCaption="ampola"
      link="Atendimento · Orquiectomia — Mel"
    />,
  );

  const texts = JSON.stringify(textsOf(renderer));

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('08 set');
  expect(texts).toContain('Saída por atendimento');
  expect(texts).toContain('-R$ 39,80');
  expect(texts).toContain('ampola');
  expect(texts).toContain('Atendimento · Orquiectomia — Mel');
});

test('highlights the category on the palette chip colour', async () => {
  const renderer = await render(
    <MovementCard
      direction="inbound"
      title="Conta de luz"
      subtitle="01 set"
      category="Contas fixas"
      value="+R$ 210,00"
    />,
  );

  const [chip] = renderer.root.findAll(node =>
    String(node.props.className ?? '').includes('bg-details-primary'),
  );

  expect(chip).toBeDefined();
  expect(JSON.stringify(textsOf(renderer))).toContain('Contas fixas');
});

test('omits the link and the caption when they are not provided', async () => {
  const renderer = await render(
    <MovementCard
      direction="inbound"
      title="Seringa 60ml (cx 30un)"
      subtitle="05 set"
      value="+R$ 145,00"
    />,
  );

  const texts = textsOf(renderer);

  expect(JSON.stringify(texts)).toContain('+R$ 145,00');
  expect(texts.filter(Boolean)).toEqual([
    'Seringa 60ml (cx 30un)',
    '05 set',
    '+R$ 145,00',
  ]);
});

test('is not pressable unless an onPress handler is given', async () => {
  const renderer = await render(
    <MovementCard
      direction="inbound"
      title="Isoflurano 100ml"
      subtitle="02 set"
      category="Pedido recebido"
      value="+R$ 945,00"
    />,
  );

  const buttons = renderer.root.findAll(
    node => node.props.accessibilityRole === 'button',
  );

  expect(buttons).toHaveLength(0);
});

test('calls onPress when pressed', async () => {
  const onPress = jest.fn();
  const renderer = await render(
    <MovementCard
      direction="inbound"
      title="Isoflurano 100ml"
      subtitle="02 set"
      category="Pedido recebido"
      value="+R$ 945,00"
      onPress={onPress}
    />,
  );

  const [button] = renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );

  await act(() => {
    button.props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
});
