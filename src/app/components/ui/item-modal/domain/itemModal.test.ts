import {
  digitsOnly,
  filterStockItems,
  formatCurrency,
  formatDateInput,
  isPastDate,
  shouldShowAddOption,
  shouldShowMinQuantity,
  type StockItem,
} from './itemModal';

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
    // "cateter" digitado com acento ainda acha "Cateter"
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

describe('digitsOnly', () => {
  it('strips letters and symbols, keeping only digits', () => {
    expect(digitsOnly('12a3b')).toBe('123');
    expect(digitsOnly('abc')).toBe('');
    expect(digitsOnly('10,5')).toBe('105');
    expect(digitsOnly('')).toBe('');
  });
});

describe('formatDateInput', () => {
  it('returns empty string when there are no digits', () => {
    expect(formatDateInput('')).toBe('');
    expect(formatDateInput('abc')).toBe('');
  });

  it('inserts slashes as digits are typed', () => {
    expect(formatDateInput('1')).toBe('1');
    expect(formatDateInput('15')).toBe('15');
    expect(formatDateInput('151')).toBe('15/1');
    expect(formatDateInput('1510')).toBe('15/10');
    expect(formatDateInput('15102030')).toBe('15/10/2030');
  });

  it('ignores non-digit characters and extra digits beyond 8', () => {
    expect(formatDateInput('15/10/2030')).toBe('15/10/2030');
    expect(formatDateInput('151020309999')).toBe('15/10/2030');
  });
});

describe('isPastDate', () => {
  const today = new Date(2030, 5, 15); // 15/06/2030

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

describe('formatCurrency', () => {
  it('returns empty string when there are no digits', () => {
    expect(formatCurrency('')).toBe('');
    expect(formatCurrency('abc')).toBe('');
  });

  it('treats digits as cents, ATM-style', () => {
    expect(formatCurrency('1')).toBe('0,01');
    expect(formatCurrency('12')).toBe('0,12');
    expect(formatCurrency('1200')).toBe('12,00');
  });

  it('adds a thousands separator', () => {
    expect(formatCurrency('123456')).toBe('1.234,56');
  });

  it('ignores non-digit characters in the input', () => {
    expect(formatCurrency('R$ 12,00')).toBe('12,00');
  });
});
