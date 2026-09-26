import {
  addSupplyItem,
  calculateSupplyTotalCost,
  getSupplyLineCost,
  removeSupplyItem,
  updateSupplyQuantity,
  type SupplyItem,
} from './supplyItem';

function supply(overrides: Partial<SupplyItem> = {}): SupplyItem {
  return {
    id: 'propofol',
    name: 'Propofol 10mg/ml 20ml',
    quantity: 1,
    unitCost: 19.9,
    source: 'stock',
    ...overrides,
  };
}

const FIGMA_ITEMS: SupplyItem[] = [
  supply(),
  supply({
    id: 'isoflurano',
    name: 'Isoflurano 250ml',
    quantity: 0.1,
    unitCost: 28,
  }),
  supply({
    id: 'seringa',
    name: 'Seringa 60ml',
    quantity: 2,
    unitCost: 5.6,
    source: 'standalone',
  }),
];

describe('getSupplyLineCost', () => {
  it.each([
    [1, 19.9, 19.9],
    [2, 5.6, 11.2],
    [0.1, 28, 2.8],
    [0, 19.9, 0],
    [3, 0, 0],
  ])('%p un. × R$ %p costs R$ %p', (quantity, unitCost, expected) => {
    expect(getSupplyLineCost(supply({ quantity, unitCost }))).toBeCloseTo(
      expected,
    );
  });
});

describe('calculateSupplyTotalCost', () => {
  it('is zero for an empty list', () => {
    expect(calculateSupplyTotalCost([])).toBe(0);
  });

  it('sums quantity × unit cost across stock and standalone items', () => {
    expect(calculateSupplyTotalCost(FIGMA_ITEMS)).toBeCloseTo(33.9);
  });

  it('equals the line cost when there is a single item', () => {
    expect(calculateSupplyTotalCost([supply({ quantity: 2 })])).toBeCloseTo(
      39.8,
    );
  });
});

describe('addSupplyItem', () => {
  it('appends a new item at the end', () => {
    const result = addSupplyItem([supply()], supply({ id: 'seringa' }));

    expect(result.map(item => item.id)).toEqual(['propofol', 'seringa']);
  });

  it('sums the quantity when the item is already in the list', () => {
    const result = addSupplyItem([supply()], supply({ quantity: 2 }));

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('does not mutate the original list', () => {
    const items = [supply()];

    addSupplyItem(items, supply({ id: 'seringa' }));

    expect(items).toHaveLength(1);
  });
});

describe('removeSupplyItem', () => {
  it('drops only the item with the given id', () => {
    const result = removeSupplyItem(FIGMA_ITEMS, 'isoflurano');

    expect(result.map(item => item.id)).toEqual(['propofol', 'seringa']);
  });

  it('leaves the list unchanged for an unknown id', () => {
    expect(removeSupplyItem(FIGMA_ITEMS, 'missing')).toEqual(FIGMA_ITEMS);
  });
});

describe('updateSupplyQuantity', () => {
  it('changes only the quantity of the matching item', () => {
    const result = updateSupplyQuantity(FIGMA_ITEMS, 'seringa', 5);

    expect(result.find(item => item.id === 'seringa')?.quantity).toBe(5);
    expect(result.find(item => item.id === 'propofol')?.quantity).toBe(1);
  });
});
