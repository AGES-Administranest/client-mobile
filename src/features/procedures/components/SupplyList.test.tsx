import ReactTestRenderer, { act } from 'react-test-renderer';

import { SupplyList, type SupplyListRow } from './SupplyList';

const ROWS: SupplyListRow[] = [
  {
    id: 'propofol',
    name: 'Propofol 10mg/ml 20ml',
    detail: '1 un. × R$ 19,90',
    cost: 'R$ 19,90',
    removeLabel: 'Remover Propofol 10mg/ml 20ml',
  },
  {
    id: 'seringa',
    name: 'Seringa 60ml',
    detail: '2 un. × R$ 5,60',
    cost: 'R$ 11,20',
    removeLabel: 'Remover Seringa 60ml',
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

test('shows the empty message when no supply was added', async () => {
  const renderer = await render(
    <SupplyList
      rows={[]}
      emptyMessage="Nenhum material adicionado"
      onRemove={jest.fn()}
    />,
  );

  expect(textsOf(renderer)).toContain('Nenhum material adicionado');
});

test('renders name, detail and cost of each row, in order', async () => {
  const renderer = await render(
    <SupplyList rows={ROWS} emptyMessage="Vazio" onRemove={jest.fn()} />,
  );

  const texts = textsOf(renderer);

  expect(texts).toContain('Propofol 10mg/ml 20ml');
  expect(texts).toContain('1 un. × R$ 19,90');
  expect(texts).toContain('R$ 11,20');
  expect(texts).not.toContain('Vazio');
  expect(texts.indexOf('Propofol')).toBeLessThan(texts.indexOf('Seringa'));
});

test('calls onRemove with the id of the row whose × was pressed', async () => {
  const onRemove = jest.fn();
  const renderer = await render(
    <SupplyList rows={ROWS} emptyMessage="Vazio" onRemove={onRemove} />,
  );

  const [removeSeringa] = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Remover Seringa 60ml' &&
      typeof node.props.onPress === 'function',
  );

  await act(() => {
    removeSeringa.props.onPress();
  });

  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(onRemove).toHaveBeenCalledWith('seringa');
});
