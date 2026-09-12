import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  StockItemSheet,
  type StockItemSheetLabels,
} from 'features/stock/components/StockItemSheet';
import type { StockItem } from 'features/stock/domain/stockItem';
import * as service from 'features/stock/services/stockItemService';

jest.mock('features/stock/services/stockItemService');
const mockedService = jest.mocked(service);

const labels: StockItemSheetLabels = {
  title: 'Insumo ou medicamento',
  fields: {
    category: 'Categoria',
    name: 'Nome',
    unit: 'Unidade',
    defaultUnitCost: 'Custo unitário (R$)',
    currentQuantity: 'Quantidade',
    minimumStock: 'Quantidade mínima no estoque',
    expirationDate: 'Validade',
  },
  placeholders: {},
  categories: {
    medication: 'Medicamento',
    anesthetic: 'Anestésico',
    disposable: 'Descartável',
  },
  units: {
    unit: 'Unidade',
    ampoule: 'Ampola',
    vial: 'Frasco',
    box: 'Caixa',
    ml: 'ml',
    mg: 'mg',
    tablet: 'Comprimido',
    other: 'Outro',
  },
  edit: 'Editar',
  delete: 'Excluir',
  errors: {
    required: 'Campo obrigatório',
    mustBeNonNegative: 'Não pode ser negativo',
    invalidDate: 'Data inválida',
  },
  confirmDelete: {
    title: 'Excluir item?',
    message: 'Dipirona será removido do estoque.',
    cancel: 'Cancelar',
    confirm: 'Excluir',
  },
};

const item: StockItem = {
  id: 'item-1',
  category: 'medication',
  name: 'Dipirona',
  unit: 'ml',
  defaultUnitCost: 12,
  currentQuantity: 5,
  minimumStock: 2,
  expirationDate: null,
};

function render(open: StockItem | null = item) {
  const handlers = {
    onClose: jest.fn(),
    onSaved: jest.fn(),
    onDeleted: jest.fn(),
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      // The sheet reads safe-area insets, which App.tsx provides at runtime.
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 375, height: 812 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <StockItemSheet item={open} labels={labels} {...handlers} />
      </SafeAreaProvider>,
    );
  });

  const buttonsByLabel = (label: string) =>
    renderer.root
      .findAll(
        node =>
          node.props.role === 'button' &&
          typeof node.props.onPress === 'function',
      )
      .filter(
        button =>
          button.findAll(node => node.props.children === label).length > 0,
      );

  return { renderer: renderer!, handlers, buttonsByLabel };
}

beforeEach(() => {
  mockedService.updateStockItem.mockImplementation(async saved => saved);
  mockedService.deleteStockItem.mockResolvedValue(undefined);
});

afterEach(() => jest.clearAllMocks());

test('renders nothing while no item is open', () => {
  const { renderer } = render(null);

  expect(renderer.root.findAllByProps({ value: 'Dipirona' })).toHaveLength(0);
});

test('shows the open item and reports a save', async () => {
  const { handlers, buttonsByLabel } = render();

  await act(() => buttonsByLabel('Editar')[0].props.onPress());

  expect(mockedService.updateStockItem).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'item-1', name: 'Dipirona' }),
  );
  expect(handlers.onSaved).toHaveBeenCalled();
});

test('asks for confirmation before deleting, and deletes on confirm', async () => {
  const { renderer, handlers, buttonsByLabel } = render();

  act(() => buttonsByLabel('Excluir')[0].props.onPress());
  expect(mockedService.deleteStockItem).not.toHaveBeenCalled();
  expect(
    renderer.root.findAllByProps({ children: 'Excluir item?' }),
  ).not.toHaveLength(0);

  // The confirm button carries the same label; after the switch it is the
  // only "Excluir" left.
  await act(() => buttonsByLabel('Excluir')[0].props.onPress());

  expect(mockedService.deleteStockItem).toHaveBeenCalledWith('item-1');
  expect(handlers.onDeleted).toHaveBeenCalledWith('item-1');
});

test('cancelling the confirmation goes back to the form', () => {
  const { renderer, buttonsByLabel } = render();

  act(() => buttonsByLabel('Excluir')[0].props.onPress());
  act(() => buttonsByLabel('Cancelar')[0].props.onPress());

  expect(renderer.root.findAllByProps({ value: 'Dipirona' })).not.toHaveLength(
    0,
  );
});
