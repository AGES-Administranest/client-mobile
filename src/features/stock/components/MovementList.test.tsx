import ReactTestRenderer, { act } from 'react-test-renderer';

import { MovementList, type MovementListItem } from './MovementList';

const ITEMS: MovementListItem[] = [
  {
    id: 'movement-1',
    direction: 'outbound',
    title: 'Propofol 10mg/ml 20ml',
    subtitle: '08 set',
    category: 'Saída por atendimento',
    value: '-2',
    valueCaption: 'ampola',
    link: 'Atendimento · Orquiectomia — Mel',
  },
  {
    id: 'movement-2',
    direction: 'inbound',
    title: 'Seringa 60ml (cx 30un)',
    subtitle: '05 set',
    category: 'Compra manual',
    value: '+1',
    valueCaption: 'caixa',
  },
];

async function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(element);
  });

  return renderer!;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

test('shows a spinner and no rows while loading', async () => {
  const renderer = await render(
    <MovementList items={ITEMS} isLoading emptyMessage="Nada por aqui." />,
  );

  expect(
    renderer.root.findAllByType('ActivityIndicator' as never),
  ).toHaveLength(1);
  expect(textsOf(renderer)).not.toContain('Propofol');
});

test('shows the empty message when there is nothing to list', async () => {
  const renderer = await render(
    <MovementList
      items={[]}
      isLoading={false}
      emptyMessage="Nenhuma movimentação registrada."
    />,
  );

  expect(textsOf(renderer)).toContain('Nenhuma movimentação registrada.');
});

test('shows the failure message and a retry button when the load failed', async () => {
  const onRetry = jest.fn();
  const renderer = await render(
    <MovementList
      items={ITEMS}
      isLoading={false}
      emptyMessage="Nada por aqui."
      error={{
        message: 'Não foi possível carregar o histórico.',
        retryLabel: 'Tentar novamente',
        onRetry,
      }}
    />,
  );

  const texts = textsOf(renderer);

  expect(texts).toContain('Não foi possível carregar o histórico.');
  expect(texts).toContain('Tentar novamente');
  expect(texts).not.toContain('Propofol');

  const [button] = renderer.root.findAll(
    node =>
      node.props.role === 'button' && typeof node.props.onPress === 'function',
  );

  await act(() => {
    button.props.onPress();
  });

  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('renders one card per movement, in the order received', async () => {
  const renderer = await render(
    <MovementList items={ITEMS} isLoading={false} emptyMessage="Nada." />,
  );

  const texts = textsOf(renderer);

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('Seringa 60ml (cx 30un)');
  expect(texts).not.toContain('Nada.');
  expect(texts.indexOf('Propofol')).toBeLessThan(texts.indexOf('Seringa'));
});
