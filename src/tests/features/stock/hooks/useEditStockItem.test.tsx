import ReactTestRenderer, { act } from 'react-test-renderer';

import type { StockItem } from 'features/stock/domain/stockItem';
import { useEditStockItem } from 'features/stock/hooks/useEditStockItem';
import * as service from 'features/stock/services/stockItemService';

jest.mock('features/stock/services/stockItemService');
const mockedService = jest.mocked(service);

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

type Hook = ReturnType<typeof useEditStockItem>;

// Hooks only run inside a component, so this harness renders one and hands
// the latest hook result back to the test.
function renderHook() {
  const callbacks = { onSaved: jest.fn(), onDeleted: jest.fn() };
  let latest!: Hook;

  function Harness() {
    latest = useEditStockItem(item, callbacks);
    return null;
  }

  act(() => {
    ReactTestRenderer.create(<Harness />);
  });

  return { hook: () => latest, callbacks };
}

beforeEach(() => {
  mockedService.updateStockItem.mockImplementation(async saved => saved);
  mockedService.deleteStockItem.mockResolvedValue(undefined);
});

afterEach(() => jest.clearAllMocks());

test('starts with the item values as text', () => {
  const { hook } = renderHook();

  expect(hook().values.name).toBe('Dipirona');
  expect(hook().values.defaultUnitCost).toBe('12');
  expect(hook().errors).toEqual({});
});

test('does not save an invalid item and exposes the error codes', async () => {
  const { hook, callbacks } = renderHook();

  act(() => hook().setField('name', '   '));
  act(() => hook().setField('minimumStock', '-1'));
  await act(() => hook().submit());

  expect(hook().errors).toEqual({
    name: 'required',
    minimumStock: 'mustBeNonNegative',
  });
  expect(mockedService.updateStockItem).not.toHaveBeenCalled();
  expect(callbacks.onSaved).not.toHaveBeenCalled();
});

test('saves a valid item with parsed numbers and reports it back', async () => {
  const { hook, callbacks } = renderHook();

  act(() => hook().setField('name', 'Dipirona 500mg'));
  act(() => hook().setField('defaultUnitCost', '19,90'));
  act(() => hook().selectUnit('ampoule'));
  await act(() => hook().submit());

  expect(mockedService.updateStockItem).toHaveBeenCalledWith({
    ...item,
    name: 'Dipirona 500mg',
    defaultUnitCost: 19.9,
    unit: 'ampoule',
  });
  expect(callbacks.onSaved).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Dipirona 500mg' }),
  );
  expect(hook().isSaving).toBe(false);
});

test('deletes the item and reports its id', async () => {
  const { hook, callbacks } = renderHook();

  await act(() => hook().remove());

  expect(mockedService.deleteStockItem).toHaveBeenCalledWith('item-1');
  expect(callbacks.onDeleted).toHaveBeenCalledWith('item-1');
});
