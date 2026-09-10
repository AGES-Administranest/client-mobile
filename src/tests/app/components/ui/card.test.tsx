import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { MaterialCard } from 'app/components/ui/card';

test('renders name, category, formatted price, quantity and minimum quantity', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <MaterialCard
        name="Propofol 10mg/ml 20ml"
        category="Medicamento"
        price={19.9}
        unit="ampola"
        quantity={8}
        minQuantity={10}
      />,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(renderer!.toJSON()).toBeTruthy();
  expect(JSON.stringify(texts)).toContain('Propofol 10mg/ml 20ml');
  expect(JSON.stringify(texts)).toContain('19.90');
  expect(JSON.stringify(texts)).toContain('8');
  expect(JSON.stringify(texts)).toContain('10');
});

test('renders an extra warning message when quantity is at or below minimum quantity', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <MaterialCard
        name="Propofol 10mg/ml 20ml"
        category="Medicamento"
        price={19.9}
        unit="ampola"
        quantity={10}
        minQuantity={10}
      />,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(JSON.stringify(texts)).toContain('Item abaixo da quantitade mínima');
});
