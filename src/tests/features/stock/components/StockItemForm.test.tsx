import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  StockItemForm,
  type StockItemFormLabels,
  type StockItemFormValues,
} from 'features/stock/components/StockItemForm';

const labels: StockItemFormLabels = {
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
};

const values: StockItemFormValues = {
  category: 'medication',
  name: 'Dipirona',
  unit: 'ml',
  defaultUnitCost: '12',
  currentQuantity: '5',
  minimumStock: '2',
  expirationDate: '2030-10-15',
};

function render(props: Partial<Parameters<typeof StockItemForm>[0]> = {}) {
  const handlers = {
    onChange: jest.fn(),
    onSelectCategory: jest.fn(),
    onSelectUnit: jest.fn(),
    onSubmit: jest.fn(),
    onDelete: jest.fn(),
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <StockItemForm
        values={values}
        errors={{}}
        labels={labels}
        isSaving={false}
        {...handlers}
        {...props}
      />,
    );
  });

  return { renderer: renderer!, handlers };
}

test('shows the item values and reports edits with the field name', () => {
  const { renderer, handlers } = render();

  const nameInput = renderer.root.findByProps({ value: 'Dipirona' });
  act(() => nameInput.props.onChangeText('Dipirona 500mg'));

  expect(handlers.onChange).toHaveBeenCalledWith('name', 'Dipirona 500mg');
});

test('renders category and unit chips and reports a unit tap', () => {
  const { renderer, handlers } = render();
  // Pressable renders as several nested nodes; only the outer one has onPress.
  const chips = renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'radio' &&
      typeof node.props.onPress === 'function',
  );

  // 3 categories + 8 units
  expect(chips).toHaveLength(11);
  const selected = chips.filter(chip => chip.props.accessibilityState.selected);
  expect(selected).toHaveLength(2);

  act(() => chips[3].props.onPress());
  expect(handlers.onSelectUnit).toHaveBeenCalledWith('unit');
});

test('renders a translated error under the failing field', () => {
  const { renderer } = render({
    errors: { defaultUnitCost: 'Não pode ser negativo' },
  });

  expect(
    renderer.root.findAllByProps({ children: 'Não pode ser negativo' }),
  ).not.toHaveLength(0);
});

test('fires onSubmit for Editar and onDelete for Excluir', () => {
  const { renderer, handlers } = render();
  const buttons = renderer.root.findAll(
    node =>
      node.props.role === 'button' && typeof node.props.onPress === 'function',
  );

  expect(buttons).toHaveLength(2);
  act(() => buttons[0].props.onPress());
  act(() => buttons[1].props.onPress());

  expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
  expect(handlers.onDelete).toHaveBeenCalledTimes(1);
});
