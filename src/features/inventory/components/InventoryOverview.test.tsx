import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { InventoryOverview } from './InventoryOverview';

const NOW = new Date(2026, 8, 13, 10);
const items = [
  {
    id: 'propofol',
    name: 'Propofol',
    category: 'Medicamento',
    price: 19.9,
    unit: 'frasco',
    quantity: 2,
    minimumStock: 5,
  },
];
const lots = [
  {
    id: 'lote-a',
    itemId: 'propofol',
    name: 'Propofol',
    expirationDate: '2026-09-15' as const,
  },
];

it('mostra resumo e os dois avisos no mesmo card', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <InventoryOverview items={items} lots={lots} referenceDate={NOW} />
      </I18nProvider>,
    );
  });

  const output = JSON.stringify(renderer!.toJSON());
  expect(output).toContain('1 item abaixo do mínimo');
  expect(output).toContain('1 lote próximo do vencimento');
  expect(output).toContain('Item abaixo da quantidade mínima');
  expect(output).toContain('Lote vence em 15/09/2026');
});

it('mostra carregamento sem produzir um falso estado vazio', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <InventoryOverview status="loading" items={[]} lots={[]} />
      </I18nProvider>,
    );
  });

  expect(JSON.stringify(renderer!.toJSON())).toContain('Carregando estoque');
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('Nenhum material');
});
