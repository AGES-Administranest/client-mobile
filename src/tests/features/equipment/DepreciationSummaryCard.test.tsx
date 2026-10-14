import ReactTestRenderer, { act } from 'react-test-renderer';

import { DepreciationSummaryCard } from 'features/equipment/components/DepreciationSummaryCard';

test('shows the label, the value and the detail line', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <DepreciationSummaryCard
        label="Depreciação total/mês"
        value="R$ 105,83"
        detail="3 equipamentos · R$ 1.270/ano"
      />,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(texts).toEqual([
    'Depreciação total/mês',
    'R$ 105,83',
    '3 equipamentos · R$ 1.270/ano',
  ]);
});
