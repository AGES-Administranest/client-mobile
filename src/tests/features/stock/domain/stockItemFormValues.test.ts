import type { StockItem } from 'features/stock/domain/stockItem';
import {
  fromFormValues,
  toFormValues,
} from 'features/stock/domain/stockItemFormValues';

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

test('toFormValues turns numbers into strings and a null expiry into an empty field', () => {
  expect(toFormValues(item)).toEqual({
    category: 'medication',
    name: 'Dipirona',
    unit: 'ml',
    defaultUnitCost: '12',
    currentQuantity: '5',
    minimumStock: '2',
    expirationDate: '',
  });
});

test('fromFormValues parses numbers, accepts a decimal comma and maps an empty expiry to null', () => {
  const parsed = fromFormValues('item-1', {
    ...toFormValues(item),
    defaultUnitCost: '19,90',
    expirationDate: '  ',
  });

  expect(parsed.defaultUnitCost).toBe(19.9);
  expect(parsed.currentQuantity).toBe(5);
  expect(parsed.expirationDate).toBeNull();
});

test('fromFormValues turns an emptied numeric field into NaN for validation to catch', () => {
  const parsed = fromFormValues('item-1', {
    ...toFormValues(item),
    currentQuantity: '',
  });

  expect(Number.isNaN(parsed.currentQuantity)).toBe(true);
});
