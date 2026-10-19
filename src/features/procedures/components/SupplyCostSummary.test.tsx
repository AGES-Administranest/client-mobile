import ReactTestRenderer, { act } from 'react-test-renderer';

import { SupplyCostSummary } from './SupplyCostSummary';

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

test('shows the supplies total', async () => {
  const renderer = await render(
    <SupplyCostSummary
      totalLabel="Total insumos"
      totalValue="– R$ 33,90"
      isDeduction
    />,
  );

  const texts = textsOf(renderer);

  expect(texts).toContain('Total insumos');
  expect(texts).toContain('– R$ 33,90');
});

test('leaves the gross margin row out when it is not provided', async () => {
  const renderer = await render(
    <SupplyCostSummary
      totalLabel="Total insumos"
      totalValue="R$ 0,00"
      isDeduction={false}
    />,
  );

  expect(textsOf(renderer)).not.toContain('Margem bruta');
});

test('shows the gross margin row when provided', async () => {
  const renderer = await render(
    <SupplyCostSummary
      totalLabel="Total insumos"
      totalValue="– R$ 33,90"
      isDeduction
      grossMargin={{ label: 'Margem bruta', value: 'R$ 586,10' }}
    />,
  );

  const texts = textsOf(renderer);

  expect(texts).toContain('Margem bruta');
  expect(texts).toContain('R$ 586,10');
});

function totalValueNode(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .find(node => String(node.props.children).includes('R$'))!;
}

test.each([
  [true, 'text-alert-primary'],
  [false, 'text-label-primary'],
])(
  'colors the total by whether it is a deduction (%p → %s)',
  async (isDeduction, expectedClass) => {
    const renderer = await render(
      <SupplyCostSummary
        totalLabel="Total insumos"
        totalValue="R$ 0,00"
        isDeduction={isDeduction}
      />,
    );

    expect(totalValueNode(renderer).props.className).toContain(expectedClass);
  },
);
