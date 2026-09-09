import type { StockItem } from 'features/stock/domain/stockItem';
import {
  isStockItemValid,
  validateStockItem,
} from 'features/stock/domain/validateStockItem';

// One known-good item; each case below changes a single field from it so a
// failure points at exactly one rule.
const validItem: Omit<StockItem, 'id'> = {
  category: 'medication',
  name: 'Drontal',
  unitCost: 100000,
  unit: 'kg',
  quantity: 5,
  minimumQuantity: 2,
  expirationDate: '2030-10-15',
};

describe('validateStockItem', () => {
  it('accepts a complete item', () => {
    const errors = validateStockItem(validItem);

    expect(errors).toEqual({});
    expect(isStockItemValid(errors)).toBe(true);
  });

  it('accepts a unit cost of zero (free samples exist)', () => {
    expect(validateStockItem({ ...validItem, unitCost: 0 })).toEqual({});
  });

  it('rejects a negative unit cost', () => {
    expect(validateStockItem({ ...validItem, unitCost: -1 })).toEqual({
      unitCost: 'mustBeNonNegative',
    });
  });

  it('treats a whitespace-only name as missing', () => {
    expect(validateStockItem({ ...validItem, name: '   ' })).toEqual({
      name: 'required',
    });
  });

  it('treats NaN (an emptied numeric field) as missing', () => {
    expect(validateStockItem({ ...validItem, quantity: NaN })).toEqual({
      quantity: 'required',
    });
  });

  it('accepts an item with no expiry date', () => {
    expect(validateStockItem({ ...validItem, expirationDate: null })).toEqual(
      {},
    );
  });

  it('rejects a calendar-impossible expiry date', () => {
    expect(
      validateStockItem({ ...validItem, expirationDate: '2030-02-30' }),
    ).toEqual({ expirationDate: 'invalidDate' });
  });

  it('reports every failing field at once', () => {
    const errors = validateStockItem({
      ...validItem,
      name: '',
      unit: '',
      minimumQuantity: -3,
    });

    expect(errors).toEqual({
      name: 'required',
      unit: 'required',
      minimumQuantity: 'mustBeNonNegative',
    });
    expect(isStockItemValid(errors)).toBe(false);
  });
});
