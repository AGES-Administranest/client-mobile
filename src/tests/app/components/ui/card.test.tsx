import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { MaterialCard } from 'app/components/ui/card';
import { I18nProvider } from 'shared/i18n';

test('renders name, category, formatted price, quantity and minimum quantity', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <MaterialCard
          name="Propofol 10mg/ml 20ml"
          category="Medicamento"
          price={19.9}
          unit="ampola"
          quantity={8}
          minQuantity={10}
        />
      </I18nProvider>,
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
  expect(JSON.stringify(texts)).not.toContain('abaixo da quantidade mínima');
});

test('renders the low-stock warning and red border when belowMinimum is true', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <MaterialCard
          name="Isoflurano 250ml"
          category="Anestésico"
          price={280}
          unit="frasco"
          quantity={2}
          minQuantity={3}
          belowMinimum
        />
      </I18nProvider>,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);

  expect(JSON.stringify(texts)).toContain('Item abaixo da quantidade mínima');

  const views = renderer!.root.findAllByType('View' as never) as never as {
    props: { className?: string };
  }[];
  expect(
    views.some(view => view.props.className?.includes('border-alert-primary')),
  ).toBe(true);
});

test('shows an alert icon only on items below the minimum', async () => {
  function render(belowMinimum: boolean) {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <I18nProvider>
          <MaterialCard
            name="Isoflurano 250ml"
            category="Anestésico"
            price={280}
            unit="frasco"
            quantity={2}
            minQuantity={3}
            belowMinimum={belowMinimum}
          />
        </I18nProvider>,
      );
    });
    return renderer!;
  }

  const svgsWhenBelow = render(true).root.findAllByType(
    'RNSVGSvgView' as never,
  );
  const svgsWhenOk = render(false).root.findAllByType('RNSVGSvgView' as never);

  expect(svgsWhenBelow.length).toBeGreaterThan(svgsWhenOk.length);
});
