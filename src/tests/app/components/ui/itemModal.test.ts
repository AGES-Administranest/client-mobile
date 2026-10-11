import {
  filterStockItems,
  isPastDate,
  toDateInput,
  shouldShowAddOption,
  shouldShowMinQuantity,
  type StockItem,
} from '../../../../app/components/ui/item-modal/domain/itemModal';

const items: StockItem[] = [
  {
    id: '1',
    name: 'Propofol 10mg/ml 20ml',
    category: 'medication',
    unitCost: 19.9,
    unit: 'ampola',
    quantity: 8,
    minQuantity: 10,
    expiration: '2030-10-15',
  },
  {
    id: '2',
    name: 'Dipirona',
    category: 'medication',
    unitCost: 12,
    unit: 'ml',
    quantity: 5,
    minQuantity: 2,
    expiration: '2030-10-15',
  },
  {
    id: '3',
    name: 'Cateter',
    category: 'disposable',
    unitCost: 3,
    unit: 'un',
    quantity: 40,
    minQuantity: 15,
    expiration: null,
  },
];

describe('filterStockItems', () => {
  it('returns all items for an empty query', () => {
    expect(filterStockItems('', items)).toHaveLength(3);
  });

  it('returns all items for a whitespace-only query', () => {
    expect(filterStockItems('   ', items)).toHaveLength(3);
  });

  it('matches by partial, case-insensitive text', () => {
    const result = filterStockItems('dipi', items);
    expect(result.map(i => i.id)).toEqual(['2']);
  });

  it('ignores accents when matching', () => {
    expect(filterStockItems('cáteter', items).map(i => i.id)).toEqual(['3']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterStockItems('xilocaina', items)).toEqual([]);
  });
});

describe('shouldShowAddOption', () => {
  it('is false when the query is empty', () => {
    expect(shouldShowAddOption('', items)).toBe(false);
  });

  it('is false when there is at least one match', () => {
    const matches = filterStockItems('propo', items);
    expect(shouldShowAddOption('propo', matches)).toBe(false);
  });

  it('is true when the query is non-empty and there are no matches', () => {
    const matches = filterStockItems('xilocaina', items);
    expect(shouldShowAddOption('xilocaina', matches)).toBe(true);
  });
});

describe('shouldShowMinQuantity', () => {
  it('shows the min-quantity field for a new item (nothing selected)', () => {
    expect(shouldShowMinQuantity(null)).toBe(true);
  });

  it('hides the min-quantity field when an existing item is selected', () => {
    expect(shouldShowMinQuantity(items[0])).toBe(false);
  });
});

describe('isPastDate', () => {
  const today = new Date(2030, 5, 15);

  it('is false while the date is incomplete', () => {
    expect(isPastDate('', today)).toBe(false);
    expect(isPastDate('15/06', today)).toBe(false);
  });

  it('is false for today and future dates', () => {
    expect(isPastDate('15/06/2030', today)).toBe(false);
    expect(isPastDate('16/06/2030', today)).toBe(false);
    expect(isPastDate('15/06/2031', today)).toBe(false);
  });

  it('is true for dates before today', () => {
    expect(isPastDate('14/06/2030', today)).toBe(true);
    expect(isPastDate('15/06/2029', today)).toBe(true);
  });
});

describe('toDateInput', () => {
  it('turns the API date into what the masked field expects', () => {
    expect(toDateInput('2027-03-31')).toBe('31/03/2027');
  });

  it('tolerates a full timestamp', () => {
    expect(toDateInput('2027-03-31T00:00:00.000Z')).toBe('31/03/2027');
  });

  it('is empty when there is no date', () => {
    expect(toDateInput(null)).toBe('');
    expect(toDateInput('')).toBe('');
  });
});

describe('isPastDate on malformed input', () => {
  it('does not treat an impossible date as a past one', () => {
    expect(isPastDate('2027-03-31')).toBe(false);
    expect(isPastDate('31/02/2027')).toBe(false);
  });

  it('still catches a real past date', () => {
    expect(isPastDate('01/01/2020')).toBe(true);
  });

  it('still accepts a real future date', () => {
    expect(isPastDate('31/12/2099')).toBe(false);
  });
});
